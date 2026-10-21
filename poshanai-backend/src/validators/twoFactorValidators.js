import Joi from 'joi';
import validationError from '../utils/validationError.js';

const setupSchema = Joi.object({}).required();
const verifySetupSchema = Joi.object({
  secret: Joi.string().pattern(/^[A-Z2-7]{16,64}$/i).required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
}).required();
const verifyLoginSchema = Joi.object({
  tempToken: Joi.string().max(2048).required(),
  code: Joi.string().pattern(/^(?:\d{6}|[A-Fa-f0-9]{10})$/).required(),
}).required();
const disableSchema = Joi.object({
  password: Joi.string().min(8).max(128).required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
}).required();

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return next(validationError());
    req.body = value;
    return next();
  };
}

export const validateTwoFactorSetup = validate(setupSchema);
export const validateTwoFactorSetupVerification = validate(verifySetupSchema);
export const validateTwoFactorLogin = validate(verifyLoginSchema);
export const validateTwoFactorDisable = validate(disableSchema);
