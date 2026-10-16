import logger from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req, res) {
  return res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
  });
}

export function errorHandler(error, req, res, _next) {
  const duplicateKey = error.code === 11000;
  const status = duplicateKey
    ? 409
    : Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;
  const code = duplicateKey
    ? 'RESOURCE_CONFLICT'
    : error.code && typeof error.code === 'string'
      ? error.code
      : 'INTERNAL_SERVER_ERROR';
  const message = duplicateKey
    ? 'A resource with these details already exists.'
    : status < 500 || !env.isProduction
      ? error.message
      : 'An unexpected error occurred.';

  if (status >= 500) {
    logger.error(`Request failed with status ${status}`, error, {
      method: req.method,
      path: req.path,
      status,
    });
  }

  return res.status(status).json({
    success: false,
    error: { code, message: message || 'An unexpected error occurred.' },
  });
}

export default errorHandler;
