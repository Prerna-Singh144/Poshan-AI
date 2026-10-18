import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as dailyLogController from '../controllers/dailyLogController.js';
import validationError from '../utils/validationError.js';

const router = Router();
const addFoodSchema = Joi.object({
  mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  ifctCode: Joi.string().trim().uppercase().min(1).max(20).required(),
  quantityGrams: Joi.number().min(1).max(2000).precision(2).required(),
}).unknown(false);
const addSupplementSchema = Joi.object({
  supplementName: Joi.string().trim().min(1).max(120).required(),
  vitamins: Joi.object({
    vitaminD: Joi.number().min(0).max(100000).default(0),
    b12: Joi.number().min(0).max(100000).default(0),
    iron: Joi.number().min(0).max(10000).default(0),
    calcium: Joi.number().min(0).max(100000).default(0),
  }).default({}).unknown(false),
}).unknown(false);
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
router.get('/foods/search', verifyToken, validate(foodSearchSchema, 'query'), dailyLogController.searchFoods);
router.post('/ai-parse', verifyToken, validate(aiParseSchema, 'body'), dailyLogController.parseFoods);
router.get('/today', verifyToken, dailyLogController.getToday);
router.delete('/:logId', verifyToken, validate(logIdSchema, 'params'), dailyLogController.removeFood);

export default router;
