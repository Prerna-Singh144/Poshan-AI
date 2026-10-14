import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import uploadReportFile, { cleanupUploadedFile } from '../middleware/uploadMiddleware.js';
import * as reportController from '../controllers/reportController.js';
import validationError from '../utils/validationError.js';

const router = Router();
const reportIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const emptyBodySchema = Joi.object({}).unknown(false);
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
}).unknown(true);

function validateReportId(req, _res, next) {
  const { error, value } = reportIdSchema.validate(req.params, { abortEarly: false });
  if (error) return next(validationError());
  req.params = value;
  return next();
}

function validateReportPagination(req, _res, next) {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) return next(validationError());
  req.pagination = { page: value.page, limit: value.limit };
  return next();
}

function validateEmptyUploadBody(req, _res, next) {
  const { error } = emptyBodySchema.validate(req.body ?? {}, { abortEarly: false });
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

const uploadRoute = [verifyToken, uploadReportFile, validateEmptyUploadBody, reportController.upload];

router.post('/upload', ...uploadRoute);
router.post('/', ...uploadRoute);
router.get('/', verifyToken, validateReportPagination, reportController.list);
router.get('/:id', verifyToken, validateReportId, reportController.getById);
router.delete('/:id', verifyToken, validateReportId, reportController.remove);

export default router;
