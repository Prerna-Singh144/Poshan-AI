import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function userPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
  return jwt.sign({ type: 'refresh' }, env.jwtRefreshSecret, {
    subject: user.id,
    expiresIn: env.jwtRefreshExpiry,
  });
}

function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(env.refreshCookiePresenceName, '1', {
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/auth',
  });
  res.clearCookie(env.refreshCookiePresenceName, {
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

function issueSession(user, res) {
  const refreshToken = createRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  setRefreshCookie(res, refreshToken);
  return { accessToken: createAccessToken(user), user: userPayload(user) };
}

async function persistRefreshTokenHash(user) {
  const result = await User.updateOne(
    { _id: user._id },
    { $set: { refreshTokenHash: user.refreshTokenHash } },
  );
  if (result.matchedCount !== 1) {
    throw new Error('User session could not be updated.');
  }
}

export const register = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) {
    throw httpError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  const user = new User({ name: req.body.name, email });
  await user.setPassword(req.body.password);
  const session = issueSession(user, res);
  await user.save();

  return res.status(201).json({ success: true, data: session });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(req.body.password))) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const session = issueSession(user, res);
  await persistRefreshTokenHash(user);
  return res.json({ success: true, data: session });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  if (!token) throw httpError(401, 'REFRESH_TOKEN_MISSING', 'Refresh token is missing.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired.');
  }

  if (payload.type !== 'refresh') {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    clearRefreshCookie(res);
    throw httpError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token is invalid or expired.');
  }

  const session = issueSession(user, res);
  await persistRefreshTokenHash(user);
  return res.json({ success: true, data: session });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtRefreshSecret);
      const user = await User.findById(payload.sub).select('+refreshTokenHash');
      if (user?.refreshTokenHash === hashToken(token)) {
        user.refreshTokenHash = null;
        await persistRefreshTokenHash(user);
      }
    } catch {
      // Clear invalid or expired cookies without disclosing token details.
    }
  }

  clearRefreshCookie(res);
  return res.json({ success: true, data: { message: 'Logged out.' } });
});

export default { register, login, refresh, logout };
