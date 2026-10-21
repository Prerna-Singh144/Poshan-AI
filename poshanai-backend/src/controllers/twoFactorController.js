import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import qrcode from 'qrcode';
import speakeasy from 'speakeasy';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AUTH_SETTINGS } from '../config/constants.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { issueAuthenticatedSession, userPayload } from './authController.js';

const totpPeriodSeconds = 30;

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function issueInvalidChallenge() {
  return httpError(401, 'TWO_FACTOR_CHALLENGE_INVALID', 'Two-factor sign-in challenge is invalid or expired.');
}

function issueInvalidOtp() {
  return httpError(400, 'INVALID_OTP', 'Invalid OTP.');
}

function generateBackupCodes() {
  return Array.from({ length: 10 }, () => randomBytes(5).toString('hex').toUpperCase());
}

function counterFromDelta(delta) {
  return Math.floor(Date.now() / (totpPeriodSeconds * 1000)) + delta.delta;
}

function currentCounterCondition(counter) {
  return {
    $or: [
      { twoFactorLastCounter: { $exists: false } },
      { twoFactorLastCounter: { $lt: counter } },
    ],
  };
}

export const setup = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.user._id,
    status: { $nin: ['pending_deletion', 'deleted'] },
  }).select('email twoFactorEnabled');
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');
  if (user.twoFactorEnabled) throw httpError(409, 'TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled.');

  const secret = speakeasy.generateSecret({
    name: `PoshanAI (${user.email})`,
    issuer: 'PoshanAI',
    length: 20,
  });
  const qrCode = await qrcode.toDataURL(secret.otpauth_url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  });

  return res.json({ success: true, data: { qrCode, secret: secret.base32 } });
});

export const verifySetup = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.user._id,
    status: { $nin: ['pending_deletion', 'deleted'] },
  }).select('+twoFactorSecret +twoFactorLastCounter');
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');
  if (user.twoFactorEnabled) throw httpError(409, 'TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled.');

  const delta = speakeasy.totp.verifyDelta({
    secret: req.body.secret,
    encoding: 'base32',
    token: req.body.code,
    window: 1,
  });
  if (!delta) throw issueInvalidOtp();

  const backupCodes = generateBackupCodes();
  user.twoFactorSecret = req.body.secret.toUpperCase();
  user.twoFactorEnabled = true;
  user.twoFactorBackupCodes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, AUTH_SETTINGS.bcryptSaltRounds)),
  );
  user.twoFactorLastCounter = counterFromDelta(delta);
  user.twoFactorChallengeHash = undefined;
  user.twoFactorChallengeExpiresAt = undefined;
  await user.save();

  return res.json({
    success: true,
    data: {
      twoFactorEnabled: true,
      backupCodes,
    },
  });
});

export const verifyLogin = asyncHandler(async (req, res) => {
  let challenge;
  try {
    challenge = jwt.verify(req.body.tempToken, env.jwtAccessSecret, {
      algorithms: ['HS256'],
      maxAge: '5m',
    });
  } catch {
    throw issueInvalidChallenge();
  }
  if (
    challenge.scope !== '2fa_pending'
    || challenge.type !== '2fa_temp'
    || typeof challenge.sub !== 'string'
    || typeof challenge.jti !== 'string'
    || !Number.isInteger(challenge.tokenVersion)
  ) {
    throw issueInvalidChallenge();
  }

  const user = await User.findOne({
    _id: challenge.sub,
    status: { $nin: ['pending_deletion', 'deleted'] },
  }).select('+twoFactorSecret +twoFactorBackupCodes +twoFactorChallengeHash +twoFactorChallengeExpiresAt +twoFactorLastCounter +twoFactorFailedAttempts +twoFactorLockUntil +tokenVersion');
  if (
    !user
    || !user.twoFactorEnabled
    || !user.twoFactorSecret
    || (user.tokenVersion ?? 0) !== challenge.tokenVersion
    || !user.twoFactorChallengeHash
    || user.twoFactorChallengeHash !== hashValue(challenge.jti)
    || !user.twoFactorChallengeExpiresAt
    || user.twoFactorChallengeExpiresAt.getTime() <= Date.now()
    || (user.twoFactorLockUntil && user.twoFactorLockUntil.getTime() > Date.now())
  ) {
    throw issueInvalidChallenge();
  }

  const code = req.body.code.toUpperCase();
  let backupCodeHash = null;
  let acceptedCounter = null;
  if (/^\d{6}$/.test(code)) {
    const delta = speakeasy.totp.verifyDelta({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (delta) acceptedCounter = counterFromDelta(delta);
  } else {
    for (const savedHash of user.twoFactorBackupCodes ?? []) {
      if (await bcrypt.compare(code, savedHash)) {
        backupCodeHash = savedHash;
        break;
      }
    }
  }
  if (acceptedCounter === null && backupCodeHash === null) {
    const failedAttempt = await User.findOneAndUpdate(
      {
        _id: user._id,
        tokenVersion: challenge.tokenVersion,
        twoFactorChallengeHash: hashValue(challenge.jti),
        twoFactorChallengeExpiresAt: { $gt: new Date() },
        twoFactorFailedAttempts: { $lt: 3 },
      },
      { $inc: { twoFactorFailedAttempts: 1 } },
      { new: true },
    ).select('+twoFactorFailedAttempts');
    if (!failedAttempt) throw issueInvalidChallenge();

    if (failedAttempt.twoFactorFailedAttempts >= 3) {
      await User.updateOne(
        {
          _id: user._id,
          tokenVersion: challenge.tokenVersion,
          twoFactorChallengeHash: hashValue(challenge.jti),
        },
        {
          $set: { twoFactorLockUntil: new Date(Date.now() + 15 * 60 * 1000) },
          $unset: { twoFactorChallengeHash: 1, twoFactorChallengeExpiresAt: 1, twoFactorFailedAttempts: 1 },
        },
      );
    }
    throw issueInvalidOtp();
  }

  const query = {
    _id: user._id,
    tokenVersion: challenge.tokenVersion,
    twoFactorEnabled: true,
    twoFactorChallengeHash: hashValue(challenge.jti),
    twoFactorChallengeExpiresAt: { $gt: new Date() },
  };
  const update = {
    $unset: {
      twoFactorChallengeHash: 1,
      twoFactorChallengeExpiresAt: 1,
      twoFactorFailedAttempts: 1,
    },
  };
  if (acceptedCounter !== null) {
    Object.assign(query, currentCounterCondition(acceptedCounter));
    update.$set = { twoFactorLastCounter: acceptedCounter };
  } else {
    query.twoFactorBackupCodes = backupCodeHash;
    update.$pull = { twoFactorBackupCodes: backupCodeHash };
  }
  const consumed = await User.updateOne(query, update);
  if (consumed.matchedCount !== 1) throw issueInvalidChallenge();

  const data = await issueAuthenticatedSession(user, req, res, 'login_2fa');
  return res.json({ success: true, data });
});

export const disable = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.user._id,
    status: { $nin: ['pending_deletion', 'deleted'] },
  }).select('+passwordHash +twoFactorSecret +twoFactorLastCounter');
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw httpError(400, 'TWO_FACTOR_NOT_ENABLED', 'Two-factor authentication is not enabled.');
  }

  const passwordValid = await user.verifyPassword(req.body.password);
  const delta = speakeasy.totp.verifyDelta({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 1,
  });
  const counter = delta ? counterFromDelta(delta) : null;
  if (!passwordValid || counter === null || (user.twoFactorLastCounter != null && counter <= user.twoFactorLastCounter)) {
    throw httpError(400, 'INVALID_CREDENTIALS', 'Password or authenticator code is incorrect.');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = [];
  user.twoFactorChallengeHash = undefined;
  user.twoFactorChallengeExpiresAt = undefined;
  user.twoFactorLastCounter = undefined;
  await user.save();

  return res.json({ success: true, data: { user: userPayload(user) } });
});

export default { setup, verifySetup, verifyLogin, disable };
