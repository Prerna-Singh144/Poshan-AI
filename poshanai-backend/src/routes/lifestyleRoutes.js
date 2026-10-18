import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as lifestyleController from '../controllers/lifestyleController.js';
import validationError from '../utils/validationError.js';

const router = Router();

const onboardingSchema = Joi.object({
  age: Joi.number().min(13).max(100),
  gender: Joi.string().valid('male', 'female', 'other'),
  weightKg: Joi.number().min(20).max(200),
  heightCm: Joi.number().min(100).max(250),
  dietType: Joi.string().valid('veg', 'non-veg', 'vegan', 'eggetarian'),
  region: Joi.string().trim().max(100),
}).min(1).unknown(false);

router.post('/onboarding', verifyToken, (req, _res, next) => {
  const { error, value } = onboardingSchema.validate(req.body ?? {}, {
    abortEarly: false,
    convert: true,
  });
  if (error) return next(validationError());
  req.body = value;
  return next();
}, lifestyleController.saveOnboarding);

export default router;
