import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as userController from '../controllers/userController.js';
import validationError from '../utils/validationError.js';

const router = Router();

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  consent: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.object({
        given: Joi.boolean().required(),
        version: Joi.string().optional(),
      }),
    )
    .optional(),
}).min(1);

const deleteAccountSchema = Joi.object({
  password: Joi.string().min(1).max(128).required(),
}).required();

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) return next(validationError());
    req.body = value;
    return next();
  };
}

router.get('/me', verifyToken, userController.getProfile);
router.patch('/me', verifyToken, validate(updateProfileSchema), userController.updateProfile);
router.get('/me/export', verifyToken, userController.exportUserData);
router.delete('/me', verifyToken, validate(deleteAccountSchema), userController.deleteAccount);

export default router;
