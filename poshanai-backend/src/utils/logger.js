import { AsyncLocalStorage } from 'node:async_hooks';
import winston from 'winston';

const requestContext = new AsyncLocalStorage();
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

function write(level, message, metadata = {}, error) {
  const fields = { ...metadata };
  const requestId = requestContext.getStore();
  if (requestId) fields.requestId = requestId;
  if (level === 'error' && error instanceof Error) {
    fields.errorMessage = error.message;
    fields.errorStack = error.stack;
  }
  baseLogger.log(level, String(message), fields);
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
