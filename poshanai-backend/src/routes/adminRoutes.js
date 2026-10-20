import { Router } from 'express';
import Joi from 'joi';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import validationError from '../utils/validationError.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('admin'));

const auditLogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  action: Joi.string().trim().min(1).max(80),
  userId: Joi.string().hex().length(24),
}).unknown(false);

function validateAuditLogQuery(req, _res, next) {
  const { error, value } = auditLogQuerySchema.validate(req.query ?? {}, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });
  if (error) return next(validationError());
  req.validatedQuery = value;
  return next();
}

router.get('/audit-logs', validateAuditLogQuery, adminController.getAuditLogs);

export default router;
