import { Router } from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/authMiddleware.js';
import uploadReportFile, { removeUploadedFile } from '../middleware/uploadMiddleware.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();
const reportIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const emptyBodySchema = Joi.object({}).unknown(false);

function validationError() {
  const error = new Error('Request validation failed.');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function validateReportId(req, _res, next) {
  const { error, value } = reportIdSchema.validate(req.params, { abortEarly: false });
  if (error) return next(validationError());
  req.params = value;
  return next();
}

function validateEmptyUploadBody(req, _res, next) {
  const { error } = emptyBodySchema.validate(req.body ?? {}, { abortEarly: false });
  if (!error) return next();

  removeUploadedFile(req.file?.path)
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
router.get('/', verifyToken, reportController.list);
router.get('/:id', verifyToken, validateReportId, reportController.getById);
router.delete('/:id', verifyToken, validateReportId, reportController.remove);

export default router;
