import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as mealPlanController from '../controllers/mealPlanController.js';
import { supportedRegions } from '../rag/ragService.js';
import validationError from '../utils/validationError.js';

const router = Router();
const generationLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const allergyOptions = [
  'nuts', 'peanut', 'peanuts', 'dairy', 'milk', 'eggs', 'egg', 'fish', 'shellfish',
  'soy', 'gluten', 'wheat', 'legumes', 'poultry', 'mushrooms', 'sesame', 'seeds',
];

const preferencesSchema = Joi.object({
  dietType: Joi.string().valid('veg', 'eggetarian', 'nonveg').default('veg'),
  allergies: Joi.array()
    .items(Joi.string().valid(...allergyOptions).insensitive())
    .max(20)
    .default([]),
  region: Joi.string().valid(...supportedRegions).insensitive().max(60).allow(null),
  activityLevel: Joi.string()
    .valid('sedentary', 'light', 'moderate', 'active', 'very_active')
    .default('moderate'),
}).unknown(false).default({});

const generateSchema = Joi.object({
  reportId: Joi.string().hex().length(24).required(),
  preferences: preferencesSchema,
}).unknown(false);
const idSchema = Joi.object({ id: Joi.string().hex().length(24).required() }).unknown(false);
const statusSchema = Joi.object({
  status: Joi.string().valid('active', 'completed').required(),
}).unknown(false);
const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

function validate(schema, source) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) return next(validationError());
    if (source === 'body') req.body = value;
    if (source === 'params') req.params = value;
    if (source === 'query') {
      req.pagination = { page: value.page, limit: value.limit };
    }
    return next();
  };
}

router.post(
  '/generate',
  verifyToken,
  generationLimiter,
  validate(generateSchema, 'body'),
  mealPlanController.generate,
);
router.get('/', verifyToken, validate(listSchema, 'query'), mealPlanController.list);
router.get('/:id', verifyToken, validate(idSchema, 'params'), mealPlanController.getById);
router.patch(
  '/:id/status',
  verifyToken,
  validate(idSchema, 'params'),
  validate(statusSchema, 'body'),
  mealPlanController.updateStatus,
);

export default router;
