import Joi from 'joi';
import { MAX_GRAMS, MIN_GRAMS } from '../services/foodCatalog.service.js';
import validationError from '../utils/validationError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Accept a real calendar date within one day of today (covers every timezone offset).
function nearToday(value, helpers) {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  // Round-trip so impossible dates such as 2026-02-31 are rejected, not rolled over.
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    return helpers.error('any.invalid');
  }
  const todayUtc = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  if (Math.abs(parsed - todayUtc) > DAY_MS) return helpers.error('any.invalid');
  return value;
}

const dateField = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom(nearToday).required();

const searchSchema = Joi.object({
  q: Joi.string().trim().min(2).max(60).required(),
  limit: Joi.number().integer().min(1).max(20).default(10),
}).unknown(false);

const addFoodSchema = Joi.object({
  ifctCode: Joi.string().trim().pattern(/^[A-Za-z0-9_-]{2,20}$/).required(),
  grams: Joi.number().min(MIN_GRAMS).max(MAX_GRAMS).precision(1),
  quantity: Joi.number().integer().min(1).max(MAX_GRAMS),
  measure: Joi.string().trim().pattern(/^[a-z][a-z0-9_-]{0,29}$/),
  date: dateField,
})
  .custom((value, helpers) => {
    const hasQuantity = value.quantity !== undefined;
    const hasMeasure = value.measure !== undefined;
    const hasGrams = value.grams !== undefined;

    if ((!hasGrams && !hasQuantity) || hasQuantity !== hasMeasure || (hasGrams && hasQuantity)) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  // Ownership comes from the JWT and nutrition from IFCT: reject userId, calories, etc.
  .unknown(false)
  .required();

const todaySchema = Joi.object({ date: dateField }).unknown(false);

function validate(schema, source) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false, convert: true, stripUnknown: true });
    if (error) return next(validationError());
    req[source] = value;
    return next();
  };
}

export const validateFoodSearch = validate(searchSchema, 'query');
export const validateAddFood = validate(addFoodSchema, 'body');
export const validateTodayLog = validate(todaySchema, 'query');
