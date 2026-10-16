import { Router } from 'express';
import { createHash } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateEmptyBody, validateLogin, validateRegister } from '../validators/authValidators.js';
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
const registerLimiter = rateLimit(authLimiterOptions);
const loginLimiter = rateLimit({
  ...authLimiterOptions,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailHash = createHash('sha256').update(email).digest('hex');
    return `${req.ip}:${emailHash}`;
  },
});

router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh', validateEmptyBody, authController.refresh);
router.post('/logout', validateEmptyBody, authController.logout);
router.post('/logout-all', verifyToken, validateEmptyBody, authController.logoutAll);

export default router;
