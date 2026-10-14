import { Router } from 'express';
import { createHash } from 'node:crypto';
import Joi from 'joi';
import { rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();
const authLimiterOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
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

function validate(schema) {
  return (req, _res, next) => {
    const body = req.body ?? {};
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const validationError = new Error('Request validation failed.');
      validationError.statusCode = 400;
      validationError.code = 'VALIDATION_ERROR';
      return next(validationError);
    }
    req.body = value;
    return next();
  };
}

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
}).required();

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(1).max(128).required(),
}).required();

const emptySchema = Joi.object({}).required();

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(emptySchema), authController.refresh);
router.post('/logout', validate(emptySchema), authController.logout);
router.post('/logout-all', verifyToken, validate(emptySchema), authController.logoutAll);

export default router;
