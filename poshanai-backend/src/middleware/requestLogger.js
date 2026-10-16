import { randomUUID } from 'node:crypto';
import { logger, runWithRequestId } from '../utils/logger.js';

export default function requestLogger(req, res, next) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-ID', requestId);

  runWithRequestId(requestId, () => {
    const request = { method: req.method, path: req.path };
    logger.info('HTTP request started.', request);
    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info('HTTP request completed.', {
        ...request,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ...(req.user?.id ? { userId: req.user.id } : {}),
      });
    });
    next();
  });
}
