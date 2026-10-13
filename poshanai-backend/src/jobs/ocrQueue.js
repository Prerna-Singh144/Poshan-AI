import { Queue, Worker } from 'bullmq';
import path from 'node:path';
import { env } from '../config/env.js';
import Report from '../models/Report.js';
import { uploadDirectory } from '../middleware/uploadMiddleware.js';
import { extractTextFromReport } from '../services/ocrService.js';
import logger from '../utils/logger.js';

const queueName = 'report-ocr';
let queue;
let worker;
let workerInitialization;
let queueErrorLogged = false;
let workerRedisErrorLogged = false;

function redisConnection(maxRetriesPerRequest, options = {}) {
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
      defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 },
    });
    queue.on('error', () => {
      if (queueErrorLogged) return;
      queueErrorLogged = true;
      logger.warn('The report OCR queue is unavailable.');
    });
  }
  return queue;
}

export async function enqueueReportOcr(reportId) {
  const reportQueue = getQueue();
  try {
    await reportQueue.add('extract-report-text', { reportId: String(reportId) }, {
      jobId: `report-${reportId}`,
    });
    queueErrorLogged = false;
    void startOcrWorker();
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

export async function processReportOcr(reportId) {
  const report = await Report.findOneAndUpdate(
    { _id: reportId, ocrStatus: 'pending' },
    { $set: { ocrStatus: 'processing' } },
    { new: true },
  );
  if (!report) return Report.findById(reportId);

  try {
    const filePath = path.resolve(uploadDirectory, path.basename(report.fileUrl));
    const result = await extractTextFromReport(filePath);
    return await Report.findOneAndUpdate(
      { _id: report._id, ocrStatus: 'processing' },
      {
        $set: {
          ocrStatus: 'completed',
          rawOcrText: result.rawText,
          extractedValues: result.extractedValues,
          processedAt: new Date(),
        },
      },
      { new: true },
    );
  } catch (error) {
    await Report.updateOne(
      { _id: report._id, ocrStatus: 'processing' },
      { $set: { ocrStatus: 'failed', processedAt: new Date() } },
    );
    throw error;
  }
}

export function startOcrWorker() {
  if (!env.redisUrl) {
    logger.warn('Redis is not configured; report uploads will use synchronous OCR.');
    return Promise.resolve();
  }
  if (worker || workerInitialization) return workerInitialization;

  workerInitialization = (async () => {
    const probe = new Queue(queueName, {
      connection: {
        ...redisConnection(1),
        connectTimeout: 1000,
        retryStrategy: (attempt) => (attempt <= 2 ? 100 : null),
      },
    });
    probe.on('error', () => {});

    let redisAvailable = false;
    try {
      await probe.waitUntilReady();
      redisAvailable = true;
    } catch {
      logger.warn('Redis is unavailable; report uploads will use synchronous OCR.');
    }

    try {
      await probe.close();
    } catch {
      logger.warn('The Redis availability probe could not be closed cleanly.');
    }
    if (!redisAvailable) return;

    worker = new Worker(
      queueName,
      async (job) => {
        await processReportOcr(job.data.reportId);
      },
      { connection: redisConnection(null), concurrency: 2 },
    );
    worker.on('failed', () => logger.error('A report OCR job failed.'));
    worker.on('ready', () => {
      workerRedisErrorLogged = false;
    });
    worker.on('error', () => {
      if (workerRedisErrorLogged) return;
      workerRedisErrorLogged = true;
      logger.warn('The report OCR worker cannot connect to Redis.');
    });
  })()
    .catch(() => {
      logger.warn('The OCR worker could not start; report uploads will use synchronous OCR.');
    })
    .finally(() => {
      workerInitialization = null;
    });

  return workerInitialization;
}

export async function closeOcrQueue() {
  await workerInitialization;
  await Promise.all([worker?.close(), queue?.close()]);
  worker = null;
  queue = null;
  workerInitialization = null;
  queueErrorLogged = false;
  workerRedisErrorLogged = false;
}
