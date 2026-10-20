import { AsyncLocalStorage } from 'node:async_hooks';
import winston from 'winston';

const requestContext = new AsyncLocalStorage();
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

function write(level, message, metadata = {}, error) {
  // Logs are operational telemetry, never a copy of request or health data.
  const safeFields = ['method', 'path', 'status', 'durationMs', 'requestId', 'errorCode'];
  const fields = Object.fromEntries(safeFields
    .filter((key) => metadata?.[key] !== undefined)
    .map((key) => [key, typeof metadata[key] === 'string'
      ? metadata[key]
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED]')
        .replace(/\b[a-f\d]{24}\b/gi, '[REDACTED]')
      : metadata[key]]));
  const requestId = requestContext.getStore();
  if (requestId) fields.requestId = requestId;
  if (level === 'error' && error instanceof Error) {
    fields.errorName = error.name;
    if (typeof error.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code)) fields.errorCode = error.code;
  }
  const safeMessage = String(message)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED]')
    .replace(/(?:mongodb(?:\+srv)?:\/\/|bearer\s+)[^\s"']+/gi, '[REDACTED]')
    .replace(/\b[a-f\d]{24}\b/gi, '[REDACTED]');
  baseLogger.log(level, safeMessage, fields);
}

export function runWithRequestId(requestId, callback) {
  return requestContext.run(requestId, callback);
}

export const logger = Object.freeze({
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, error, metadata) => write('error', message, metadata, error),
});

export default logger;
