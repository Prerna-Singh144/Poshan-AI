import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { AUTH_SETTINGS, COMPLIANCE_SETTINGS } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';

function userPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    consent: user.consent,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user) {
  return jwt.sign({ role: user.role, type: 'access' }, env.jwtAccessSecret, {
    subject: user.id,
    expiresIn: env.jwtAccessExpiry,
  });
}

function createRefreshToken(user) {
  return jwt.sign({ type: 'refresh', jti: randomUUID() }, env.jwtRefreshSecret, {
    subject: user.id,
    expiresIn: env.jwtRefreshExpiry,
  });
}

function issueSession(user, deviceInfo = 'Unknown device') {
  const refreshToken = createRefreshToken(user);
  const now = new Date();
  return {
    refreshToken,
    refreshTokenEntry: {
      hash: hashToken(refreshToken),
      deviceInfo: deviceInfo.slice(0, 256) || 'Unknown device',
      createdAt: now,
      lastUsedAt: now,
    },
    data: { accessToken: createAccessToken(user), user: userPayload(user) },
  };
}

function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: AUTH_SETTINGS.refreshCookieMaxAgeMs,
  });
  res.cookie(env.refreshCookiePresenceName, '1', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_SETTINGS.refreshCookieMaxAgeMs,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
  res.clearCookie(env.refreshCookiePresenceName, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

async function appendRefreshToken(userId, refreshTokenEntry) {
  const result = await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: { $each: [refreshTokenEntry], $slice: -AUTH_SETTINGS.maxRefreshSessions } } },
  );
  if (result.matchedCount !== 1) {
    throw new Error('User session could not be updated.');
  }
}

async function invalidateRefreshTokens(userId) {
  await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
}

export const register = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) {
    throw httpError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  const consentGiven = typeof req.body.consent === 'boolean' ? req.body.consent : Boolean(req.body.consent?.given);
  if (!consentGiven) {
    throw httpError(400, 'VALIDATION_ERROR', 'You must accept the privacy policy');
  }

  const consentVersion = (typeof req.body.consent === 'object' && req.body.consent?.version)
    ? req.body.consent.version
    : (COMPLIANCE_SETTINGS?.policyVersion ?? '1.0');

  const user = new User({
    name: req.body.name,
    email,
    consent: {
      given: true,
      givenAt: new Date(),
      version: consentVersion,
    },
  });
  await user.setPassword(req.body.password);
  const issued = issueSession(user, req.get('user-agent') ?? 'Unknown device');
  user.refreshTokens.push(issued.refreshTokenEntry);
  await user.save();
  setRefreshCookie(res, issued.refreshToken);

  await logAuditEvent({ userId: user._id, action: 'register', req });

  return res.status(201).json({ success: true, data: issued.data });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(req.body.password))) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  if (user.status === 'pending_deletion') {
    throw httpError(403, 'ACCOUNT_DELETION_PENDING', 'This account is scheduled for deletion.');
  }

  const issued = issueSession(user, req.get('user-agent') ?? 'Unknown device');
  await appendRefreshToken(user._id, issued.refreshTokenEntry);
  setRefreshCookie(res, issued.refreshToken);

  await logAuditEvent({ userId: user._id, action: 'login', req });

  return res.json({ success: true, data: issued.data });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  if (!token) {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_MISSING', 'Refresh token is missing.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] });
  } catch {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired.');
  }

  if (payload.type !== 'refresh') {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token is invalid or expired.');
  }

  const currentHash = hashToken(token);
  const currentSession = user.refreshTokens.find((entry) => entry.hash === currentHash);
  if (!currentSession) {
    await invalidateRefreshTokens(user._id);
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token reuse was detected. Please sign in again.');
  }

  const issued = issueSession(user, currentSession.deviceInfo);
  const result = await User.updateOne(
    { _id: user._id, refreshTokens: { $elemMatch: { hash: currentHash } } },
    {
      $set: {
        'refreshTokens.$.hash': issued.refreshTokenEntry.hash,
        'refreshTokens.$.lastUsedAt': issued.refreshTokenEntry.lastUsedAt,
      },
    },
  );
  if (result.matchedCount !== 1) {
    await invalidateRefreshTokens(user._id);
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token reuse was detected. Please sign in again.');
  }

  setRefreshCookie(res, issued.refreshToken);
  return res.json({ success: true, data: issued.data });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  let loggedUserId = null;
  if (token) {
    let payload;
    try {
      payload = jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] });
    } catch {
      // Clear invalid or expired cookies without disclosing token details.
    }
    if (payload?.type === 'refresh' && payload.sub) {
      loggedUserId = payload.sub;
      await User.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { hash: hashToken(token) } } },
      );
    }
  }

  clearRefreshCookie(res);
  await logAuditEvent({ userId: loggedUserId, action: 'logout', req });
  return res.json({ success: true, data: { message: 'Logged out.' } });
});

export const logoutAll = asyncHandler(async (req, res) => {
  const result = await User.updateOne(
    { _id: req.user.id },
    { $set: { refreshTokens: [] } },
  );
  if (result.matchedCount !== 1) {
    throw httpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  clearRefreshCookie(res);
  await logAuditEvent({ userId: req.user.id, action: 'logout_all', req });
  return res.json({ success: true, data: { message: 'Logged out of all devices.' } });
});

export default { register, login, refresh, logout, logoutAll };
