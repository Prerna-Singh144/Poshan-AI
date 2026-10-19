import Joi from 'joi';
import validationError from '../utils/validationError.js';

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  age: Joi.number().min(13).max(100).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  weightKg: Joi.number().min(20).max(200).optional(),
  heightCm: Joi.number().min(100).max(250).optional(),
  activityLevel: Joi.string().valid('sedentary', 'moderate', 'active').optional(),
  dietType: Joi.string().valid('veg', 'non-veg', 'vegan', 'eggetarian').optional(),
  region: Joi.string().optional(),
  consent: Joi.alternatives()
    .try(
      Joi.boolean().valid(true),
      Joi.object({
        given: Joi.boolean().valid(true).required(),
        version: Joi.string().optional(),
      }),
    )
    .required(),
}).required();

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(1).max(128).required(),
}).required();

const emptySchema = Joi.object({}).required();

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) {
      const onlyConsentError = error.details.every((d) => d.path[0] === 'consent');
      if (onlyConsentError) {
        return next(validationError('You must accept the privacy policy'));
      }
      return next(validationError());
    }
    req.body = value;
    return next();
  };
}

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateEmptyBody = validate(emptySchema);
