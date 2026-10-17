import Joi from 'joi';
import validationError from '../utils/validationError.js';

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
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
