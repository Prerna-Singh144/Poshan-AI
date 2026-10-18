import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as lifestyleController from '../controllers/lifestyleController.js';
import validationError from '../utils/validationError.js';

const router = Router();

// Combined schema (Basic Profile + Lifestyle details)
const onboardingSchema = Joi.object({
  // Basic Details
  age: Joi.number().min(13).max(100),
  gender: Joi.string().valid('male', 'female', 'other'),
  weightKg: Joi.number().min(20).max(200),
  heightCm: Joi.number().min(100).max(250),
  region: Joi.string().trim().max(100),

  // Lifestyle Details
  dietType: Joi.string().valid('veg', 'non-veg', 'eggetarian', 'vegan'),
  mealsPerDay: Joi.number().integer().min(1).max(10),
  typicalDiet: Joi.array().items(Joi.string().trim().min(1).max(40)).max(30),
  sleepHours: Joi.number().min(1).max(16),
  sleepTime: Joi.string().valid('early', 'regular', 'late night'),
  sunExposure: Joi.string().valid('high', 'moderate', 'low'),
  activityLevel: Joi.string().valid('sedentary', 'moderate', 'active'),
  habits: Joi.array().items(Joi.string().valid('smoking', 'alcohol', 'none')).min(1).unique()
    .custom((values, helpers) => (values.includes('none') && values.length > 1 ? helpers.error('any.invalid') : values)),
  symptoms: Joi.array().items(Joi.string().valid('fatigue', 'hair fall', 'bone pain', 'none')).min(1).unique()
    .custom((values, helpers) => (values.includes('none') && values.length > 1 ? helpers.error('any.invalid') : values)),
  consent: Joi.boolean().valid(true).required(),
}).min(1).unknown(false);

// AI Explanation Schema
const explainSchema = Joi.object({
  testName: Joi.string().valid('Vitamin D', 'Vitamin B12', 'Complete blood count (CBC)').required(),
  reason: Joi.string().trim().min(1).max(500).required(),
  language: Joi.string().valid('hinglish', 'english').required(),
}).unknown(false);

// Validation Middleware Helper
function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) return next(validationError());
    req.body = value;
    return next();
  };
}

// Routes (Merged)
router.post('/onboarding', verifyToken, validate(onboardingSchema), lifestyleController.saveOnboarding);
router.get('/recommendations', verifyToken, lifestyleController.getRecommendations);
router.post('/explain-test', verifyToken, validate(explainSchema), lifestyleController.explainTest);

export default router;