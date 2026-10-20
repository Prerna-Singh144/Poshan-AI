import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as dailyLogController from '../controllers/dailyLogController.js';
import validationError from '../utils/validationError.js';
import { getSupplementIds } from '../services/supplementCatalogService.js';
import { MICRONUTRIENTS } from '../config/constants.js';

const router = Router();
const aiLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const addFoodSchema = Joi.object({
  mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  ifctCode: Joi.string().trim().uppercase().min(1).max(20).required(),
  quantityGrams: Joi.number().min(1).max(2000).precision(2).required(),
}).unknown(false);
const addSupplementSchema = Joi.object({
  supplementId: Joi.string().valid(...getSupplementIds()),
  dosage: Joi.number().positive().max(100000).precision(3),
  unit: Joi.string().trim().min(1).max(20),
  supplementName: Joi.string().trim().min(1).max(120),
  vitamins: Joi.object({
    ...Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [
      key,
      Joi.number().min(0).max(100000).default(0),
    ])),
    b12: Joi.number().min(0).max(100000).default(0),
  }).default({}).unknown(false),
}).xor('supplementId', 'supplementName')
  .when(Joi.object({ supplementId: Joi.exist() }).unknown(), {
    then: Joi.object({ dosage: Joi.required(), unit: Joi.required(), vitamins: Joi.forbidden() }),
    otherwise: Joi.object({ dosage: Joi.forbidden(), unit: Joi.forbidden() }),
  })
  .unknown(false);
const logIdSchema = Joi.object({
  logId: Joi.string().hex().length(24).required(),
}).unknown(false);
const foodSearchSchema = Joi.object({
  q: Joi.string().trim().min(2).max(60).required(),
}).unknown(false);
const aiParseSchema = Joi.object({
  text: Joi.string().trim().min(3).max(2000).required(),
}).unknown(false);

function validate(schema, source) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) return next(validationError());
    req[source] = value;
    return next();
  };
}

router.post('/add-food', verifyToken, validate(addFoodSchema, 'body'), dailyLogController.addFood);
router.post('/add-supplement', verifyToken, validate(addSupplementSchema, 'body'), dailyLogController.addSupplement);
router.post('/smart-log', verifyToken, aiLimiter, validate(aiParseSchema, 'body'), dailyLogController.smartLog);
router.get('/foods/search', verifyToken, validate(foodSearchSchema, 'query'), dailyLogController.searchFoods);
router.post('/ai-parse', verifyToken, aiLimiter, validate(aiParseSchema, 'body'), dailyLogController.parseFoods);
router.get('/today', verifyToken, dailyLogController.getToday);
router.delete('/:logId', verifyToken, validate(logIdSchema, 'params'), dailyLogController.removeFood);

export default router;
