import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as expertController from '../controllers/expertController.js';
import validationError from '../utils/validationError.js';

const router = Router();
const listSchema = Joi.object({
  role: Joi.string().valid('doctor', 'dietitian', 'nutritionist'),
  specialization: Joi.string().trim().min(2).max(120),
  minExperience: Joi.number().min(0).max(80),
  minRating: Joi.number().min(0).max(5),
  maxFees: Joi.number().min(0).max(1_000_000),
  availableOn: Joi.date().iso().raw(),
}).unknown(false);
const bookSchema = Joi.object({
  expertId: Joi.string().hex().length(24).required(),
  scheduledAt: Joi.date().iso().required(),
}).unknown(false);

function validate(schema, source) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false, convert: true, stripUnknown: true });
    if (error) return next(validationError());
    req[source] = value;
    return next();
  };
}

router.get('/', validate(listSchema, 'query'), expertController.list);
router.post('/book', verifyToken, validate(bookSchema, 'body'), expertController.book);

export default router;
