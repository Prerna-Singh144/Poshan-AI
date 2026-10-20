import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import uploadReportFile, { cleanupUploadedFile } from '../middleware/uploadMiddleware.js';
import * as reportController from '../controllers/reportController.js';
import validationError from '../utils/validationError.js';
import { sensitiveRateLimiter } from '../middleware/sensitiveRateLimiter.js';

const router = Router();
const uploadLimiter = sensitiveRateLimiter({ name: 'report-uploads', windowMs: 60 * 60 * 1000, limit: 10 });
const reportIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const emptyBodySchema = Joi.object({}).unknown(false);
const reviewSchema = Joi.object({
  reviewStatus: Joi.string().valid('confirmed', 'corrected').required(),
  extractedValues: Joi.when('reviewStatus', {
    is: 'corrected',
    then: Joi.array().items(Joi.object({
      nutrient: Joi.string().valid('Vitamin D', 'Vitamin B12', 'Iron', 'Calcium', 'Hemoglobin').required(),
      value: Joi.number().required(),
      unit: Joi.string().allow(null, '').default(null),
      referenceRange: Joi.string().allow(null, '').default(null),
      flag: Joi.string().valid('normal', 'low', 'high', 'unknown').default('unknown'),
      normalizedValue: Joi.number().allow(null).default(null),
      normalizedUnit: Joi.string().allow(null, '').default(null),
    }).unknown(false)).required(),
    otherwise: Joi.forbidden(),
  }),
}).unknown(false);
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
}).unknown(false);

function validateReportId(req, _res, next) {
  const { error, value } = reportIdSchema.validate(req.params, { abortEarly: false, stripUnknown: true });
  if (error) return next(validationError());
  req.params = value;
  return next();
}

function validateReportPagination(req, _res, next) {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) return next(validationError());
  req.pagination = { page: value.page, limit: value.limit };
  return next();
}

function validateEmptyUploadBody(req, _res, next) {
  const { error } = emptyBodySchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (!error) return next();

  cleanupUploadedFile(req.file)
    .then(() => next(validationError()))
    .catch(() => {
      const cleanupError = new Error('The uploaded file could not be safely cleaned up.');
      cleanupError.statusCode = 500;
      cleanupError.code = 'UPLOAD_CLEANUP_FAILED';
      next(cleanupError);
    });
}

const uploadRoute = [verifyToken, uploadLimiter, uploadReportFile, validateEmptyUploadBody, reportController.upload];

router.post('/upload', ...uploadRoute);
router.post('/', ...uploadRoute);
router.get('/', verifyToken, validateReportPagination, reportController.list);
router.get('/:id', verifyToken, validateReportId, reportController.getById);
router.patch('/:id/review', verifyToken, validateReportId, (req, _res, next) => {
  const { error, value } = reviewSchema.validate(req.body, { abortEarly: false, convert: true, stripUnknown: true });
  if (error) return next(validationError());
  req.body = value;
  return next();
}, reportController.review);
router.delete('/:id', verifyToken, validateReportId, reportController.remove);

export default router;
