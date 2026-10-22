import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as otpController from '../controllers/otpController.js';
import { OTP_SETTINGS } from '../config/constants.js';
import { createSensitiveRateLimitStore } from '../middleware/sensitiveRateLimiter.js';
import {
  validateOtpRequest,
  validateOtpVerification,
  validatePasswordReset,
} from '../validators/otpValidators.js';

const router = Router();
const otpLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({
    windowMs: OTP_SETTINGS.rateLimitWindowMs,
    limit: OTP_SETTINGS.rateLimitRequests,
    store: createSensitiveRateLimitStore('otp-requests'),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many code requests. Try again later.' },
    }),
  });

// These public routes are protected by short-lived, single-use OTP/reset tokens and the IP limiter.
router.use(otpLimiter);
router.post('/request', validateOtpRequest, otpController.requestOTP);
router.post('/verify', validateOtpVerification, otpController.verifyOTP);
router.post('/reset-password', validatePasswordReset, otpController.resetPassword);

export default router;
