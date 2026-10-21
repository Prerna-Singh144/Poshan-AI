import { Router } from 'express';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import * as twoFactorController from '../controllers/twoFactorController.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { createSensitiveRateLimitStore, sensitiveRateLimiter } from '../middleware/sensitiveRateLimiter.js';
import { validateEmptyBody, validateLogin, validateRegister } from '../validators/authValidators.js';
import {
  validateTwoFactorDisable,
  validateTwoFactorLogin,
  validateTwoFactorSetup,
  validateTwoFactorSetupVerification,
} from '../validators/twoFactorValidators.js';
import { RATE_LIMITS } from '../config/constants.js';

const router = Router();
const authLimiterOptions = {
  windowMs: RATE_LIMITS.authWindowMs,
  limit: RATE_LIMITS.authRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' },
  }),
};
const registerLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit(authLimiterOptions);
const loginLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({
  ...authLimiterOptions,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailHash = createHash('sha256').update(email).digest('hex');
    return `${req.ip}:${emailHash}`;
  },
  });

// Registration and login are public; refresh and logout are authorized by the HTTP-only refresh cookie.
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh', validateEmptyBody, authController.refresh);
router.post('/logout', validateEmptyBody, authController.logout);
router.post('/logout-all', verifyToken, validateEmptyBody, authController.logoutAll);

const twoFactorLimiter = (name) => sensitiveRateLimiter({
  name,
  windowMs: RATE_LIMITS.authWindowMs,
  limit: RATE_LIMITS.authRequests,
});

function readTempToken(req) {
  try {
    const payload = jwt.verify(req.body?.tempToken, env.jwtAccessSecret, { algorithms: ['HS256'] });
    if (payload.scope !== '2fa_pending' || payload.type !== '2fa_temp' || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

async function lockTwoFactorAccount(req, res) {
  const challenge = readTempToken(req);
  if (challenge) {
    try {
      await User.updateOne(
        { _id: challenge.sub, tokenVersion: challenge.tokenVersion },
        {
          $set: { twoFactorLockUntil: new Date(Date.now() + 15 * 60 * 1000) },
          $unset: { twoFactorChallengeHash: 1, twoFactorChallengeExpiresAt: 1, twoFactorFailedAttempts: 1 },
        },
      );
    } catch {
      // Keep the response generic if account lock persistence fails.
    }
  }
  return res.status(429).json({
    success: false,
    error: { code: 'TWO_FACTOR_RATE_LIMITED', message: 'Too many verification attempts. Try again in 15 minutes.' },
  });
}

const twoFactorIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createSensitiveRateLimitStore('2fa-verify-ip'),
  handler: lockTwoFactorAccount,
});

const twoFactorAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createSensitiveRateLimitStore('2fa-verify-user'),
  keyGenerator: (req) => {
    const challenge = readTempToken(req);
    return challenge?.sub ? `user:${challenge.sub}` : `invalid:${ipKeyGenerator(req.ip)}`;
  },
  handler: lockTwoFactorAccount,
});

router.post('/2fa/setup', verifyToken, twoFactorLimiter('2fa-setup'), validateTwoFactorSetup, twoFactorController.setup);
router.post('/2fa/verify-setup', verifyToken, twoFactorLimiter('2fa-verify-setup'), validateTwoFactorSetupVerification, twoFactorController.verifySetup);
// Public by design: this endpoint exchanges a five-minute, purpose-bound login challenge for a session.
router.post('/2fa/verify-login', validateTwoFactorLogin, twoFactorIpLimiter, twoFactorAccountLimiter, twoFactorController.verifyLogin);
router.post('/2fa/disable', verifyToken, twoFactorLimiter('2fa-disable'), validateTwoFactorDisable, twoFactorController.disable);

export default router;
