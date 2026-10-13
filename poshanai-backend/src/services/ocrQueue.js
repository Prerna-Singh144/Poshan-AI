import { Queue, Worker } from 'bullmq';
import path from 'node:path';
import { env } from '../config/env.js';
import Report from '../models/Report.js';
import { extractTextFromReport } from './ocrService.js';
import { uploadDirectory } from '../middleware/uploadMiddleware.js';
import logger from '../utils/logger.js';

const queueName = 'report-ocr';
let queue;
let worker;

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function redisConnection() {
  if (!env.redisUrl) {
    throw httpError(503, 'OCR_QUEUE_UNAVAILABLE', 'Report processing is not configured.');
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
    maxRetriesPerRequest: null,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

function getQueue() {
  if (!queue) {
    queue = new Queue(queueName, { connection: redisConnection() });
    queue.on('error', () => logger.error('The report OCR queue encountered an error.'));
  }
  return queue;
}

export async function enqueueReportOcr(reportId) {
  await getQueue().add('extract-report-text', { reportId: String(reportId) }, {
    jobId: `report-${reportId}`,
  });
}

export function startOcrWorker() {
  if (!env.redisUrl) {
    logger.warn('Report OCR worker not started because REDIS_URL is not configured.');
    return;
  }
  if (worker) return;

  worker = new Worker(
    queueName,
    async (job) => {
      const report = await Report.findById(job.data.reportId);
      if (!report) return;

      await Report.updateOne({ _id: report._id }, { $set: { ocrStatus: 'processing' } });
      try {
        const filePath = path.resolve(uploadDirectory, path.basename(report.fileUrl));
        const result = await extractTextFromReport(filePath);
        await Report.updateOne(
          { _id: report._id },
          {
            $set: {
              ocrStatus: 'completed',
              rawOcrText: result.rawText,
              extractedValues: result.extractedValues,
              processedAt: new Date(),
            },
          },
        );
      } catch (error) {
        await Report.updateOne(
          { _id: report._id },
          { $set: { ocrStatus: 'failed', processedAt: new Date() } },
        );
        throw error;
      }
    },
    { connection: redisConnection(), concurrency: 2 },
  );
  worker.on('failed', () => logger.error('A report OCR job failed.'));
  worker.on('error', () => logger.error('The report OCR worker encountered an error.'));
}

export async function closeOcrQueue() {
  await Promise.all([worker?.close(), queue?.close()]);
  worker = null;
  queue = null;
}
