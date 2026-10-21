import Joi from 'joi';
import validationError from '../utils/validationError.js';

const requestOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required(),
  purpose: Joi.string().valid('login', 'reset-password', 'verify-email').required(),
}).required();

const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required(),
  purpose: Joi.string().valid('login', 'reset-password', 'verify-email').required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
}).required();

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().min(32).max(128).required(),
  password: Joi.string().min(8).max(128).required(),
}).required();

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) return next(validationError());
    req.body = value;
    return next();
  };
}

export const validateOtpRequest = validate(requestOtpSchema);
export const validateOtpVerification = validate(verifyOtpSchema);
export const validatePasswordReset = validate(resetPasswordSchema);
