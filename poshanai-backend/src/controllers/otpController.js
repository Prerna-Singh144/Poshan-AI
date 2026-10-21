import { createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { AUTH_SETTINGS, OTP_SETTINGS } from '../config/constants.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import { clearRefreshCookie, issueAuthenticatedSession } from './authController.js';
import { sendEmail } from '../utils/sendEmail.js';

const purposeLabels = Object.freeze({
  login: 'sign-in',
  'reset-password': 'password reset',
  'verify-email': 'email verification',
});

const genericOtpError = () => httpError(400, 'OTP_INVALID_OR_EXPIRED', 'The code is invalid or expired. Request a new code.');

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function otpEmail(otp, purpose) {
  const label = purposeLabels[purpose];
  const expiryMinutes = env.otpExpiryMinutes;
  return {
    subject: `Your PoshanAI ${label} code`,
    text: `Your PoshanAI ${label} code is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code.`,
    html: `<p>Your PoshanAI ${label} code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${otp}</p><p>It expires in ${expiryMinutes} minutes. Do not share this code.</p>`,
  };
}

export const requestOTP = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const { purpose } = req.body;
  const user = await User.findOne({
    email,
    status: { $nin: ['pending_deletion', 'deleted'] },
  }).select('emailVerified');
  const eligible = user && (purpose !== 'verify-email' || !user.emailVerified);
  let otp = null;

  if (eligible) {
    otp = String(randomInt(100_000, 1_000_000));
    const otpHash = await bcrypt.hash(otp, OTP_SETTINGS.bcryptSaltRounds);
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email, purpose },
      { $set: { email, purpose, otpHash, attempts: 0, expiresAt } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    try {
      const message = otpEmail(otp, purpose);
      await sendEmail({ to: email, ...message });
    } catch {
      logger.warn('OTP email delivery failed.');
      if (process.env.NODE_ENV === 'production') {
        await Otp.deleteOne({ email, purpose, otpHash });
        otp = null;
      }
    }
  }

  const data = {
    message: 'If the email is eligible, a code will be sent shortly.',
  };
  if (otp && process.env.NODE_ENV !== 'production') data.dev_otp = otp;
  return res.json({ success: true, data });
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const { purpose, otp } = req.body;
  const challenge = await Otp.findOneAndUpdate(
    {
      email,
      purpose,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: env.otpMaxAttempts },
    },
    { $inc: { attempts: 1 } },
    { new: true },
  ).select('+otpHash').lean();

  if (!challenge) throw genericOtpError();

  const valid = await bcrypt.compare(otp, challenge.otpHash);
  if (!valid) {
    const maxAttemptsReached = challenge.attempts >= env.otpMaxAttempts;
    if (maxAttemptsReached) {
      await Otp.deleteOne({ _id: challenge._id, otpHash: challenge.otpHash });
    }
    throw httpError(
      400,
      maxAttemptsReached ? 'OTP_MAX_ATTEMPTS' : 'OTP_INVALID',
      maxAttemptsReached ? 'Too many incorrect codes. Request a new code.' : 'The code is invalid or expired.',
    );
  }

  const consumed = await Otp.deleteOne({
    _id: challenge._id,
    otpHash: challenge.otpHash,
    attempts: challenge.attempts,
  });
  if (consumed.deletedCount !== 1) throw genericOtpError();

  const user = await User.findOne({
    email,
    status: { $nin: ['pending_deletion', 'deleted'] },
  });
  if (!user) throw genericOtpError();

  if (purpose === 'login') {
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    const data = await issueAuthenticatedSession(user, req, res, 'otp_login');
    return res.json({ success: true, data });
  }

  if (purpose === 'reset-password') {
    const resetToken = randomBytes(32).toString('base64url');
    const passwordResetTokenExpiresAt = new Date(Date.now() + AUTH_SETTINGS.passwordResetTokenTtlMs);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: hashResetToken(resetToken),
          passwordResetTokenExpiresAt,
        },
      },
    );
    return res.json({
      success: true,
      data: { resetToken, expiresInSeconds: AUTH_SETTINGS.passwordResetTokenTtlMs / 1000 },
    });
  }

  user.emailVerified = true;
  await user.save();
  return res.json({ success: true, data: { emailVerified: true } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, AUTH_SETTINGS.bcryptSaltRounds);
  const result = await User.updateOne(
    {
      passwordResetTokenHash: hashResetToken(req.body.resetToken),
      passwordResetTokenExpiresAt: { $gt: new Date() },
      status: { $nin: ['pending_deletion', 'deleted'] },
    },
    {
      $set: { passwordHash, refreshTokens: [], emailVerified: true },
      $unset: { passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 },
    },
  );
  if (result.matchedCount !== 1) {
    throw httpError(400, 'RESET_TOKEN_INVALID', 'The reset link is invalid or expired. Request a new code.');
  }

  clearRefreshCookie(res);
  return res.json({ success: true, data: { message: 'Password updated. You can now sign in.' } });
});

export default { requestOTP, verifyOTP, resetPassword };
