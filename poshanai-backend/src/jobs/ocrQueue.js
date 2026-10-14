import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export const queueName = 'ocr-processing';
let queue;
let queueErrorLogged = false;

export function redisConnection(maxRetriesPerRequest, options = {}) {
  if (!env.redisUrl) {
    const error = new Error('REDIS_URL is not configured.');
    error.code = 'REDIS_NOT_CONFIGURED';
    throw error;
  }

  let url;
  try {
    url = new URL(env.redisUrl);
  } catch {
    throw new Error('REDIS_URL is not a valid Redis connection URL.');
  }
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use the redis or rediss protocol.');
  }

  const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;
  if (!Number.isInteger(database) || database < 0) throw new Error('REDIS_URL has an invalid database path.');

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: database,
    maxRetriesPerRequest,
    ...options,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

function getQueue() {
  if (!queue) {
    queue = new Queue(queueName, {
      connection: redisConnection(1, {
        connectTimeout: 1000,
        retryStrategy: (attempt) => (attempt <= 2 ? 100 : null),
      }),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
    queue.on('error', () => {
      if (queueErrorLogged) return;
      queueErrorLogged = true;
      logger.warn('The report OCR queue is unavailable.');
    });
  }
  return queue;
}

export async function enqueueReportOcr(reportId, { jobId = `report-${reportId}` } = {}) {
  const reportQueue = getQueue();
  try {
    await reportQueue.add(
      'extract-report-text',
      { reportId: String(reportId) },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    queueErrorLogged = false;
  } catch (error) {
    queue = null;
    try {
      await reportQueue.close();
    } catch {
      logger.warn('The unavailable report OCR queue could not be closed cleanly.');
    }
    throw error;
  }
}

export function getReportQueue() {
  return getQueue();
}

export async function closeOcrQueue() {
  await queue?.close();
  queue = null;
  queueErrorLogged = false;
}
