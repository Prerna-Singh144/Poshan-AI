import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
  closeOcrQueue,
  enqueueReportOcr,
  getReportQueue,
  queueName,
  redisConnection,
} from './queue.js';
import Report from '../models/Report.js';
import { processReportOcr } from '../services/ocrProcessor.js';
import logger from '../utils/logger.js';
import { OCR_SETTINGS } from '../config/constants.js';

let worker;
let sweepTimer;
let sweepInProgress = false;

async function markReportFailed(reportId, error) {
  const reason = typeof error?.code === 'string' ? error.code : 'OCR_PROCESSING_FAILED';
  await Report.updateOne(
    { _id: reportId, ocrStatus: 'processing' },
    {
      $set: {
        ocrStatus: 'failed',
        ocrError: reason.slice(0, 500),
        processedAt: new Date(),
        processingStartedAt: null,
      },
    },
  );
}

async function sweepStaleReports() {
  if (sweepInProgress) return;
  sweepInProgress = true;
  try {
    const staleBefore = new Date(Date.now() - OCR_SETTINGS.processingTimeoutMs);
    const staleReports = await Report.find({
      ocrStatus: 'processing',
      $or: [
        { processingStartedAt: { $lt: staleBefore } },
        { processingStartedAt: null, uploadedAt: { $lt: staleBefore } },
      ],
    })
      .select('_id')
      .lean();
    const reportIds = staleReports.map((report) => report._id);
    const result = await Report.updateMany(
      { _id: { $in: reportIds }, ocrStatus: 'processing' },
      {
        $set: {
          ocrStatus: 'pending',
          processingStartedAt: null,
          ocrError: 'OCR_WORKER_STALE',
        },
      },
    );
    if (result.modifiedCount > 0) {
      logger.warn(`Reset ${result.modifiedCount} stale report OCR job(s) to pending.`);
      await Promise.all(
        reportIds.map((reportId) =>
          enqueueReportOcr(reportId, { jobId: `report-${reportId}-recovery-${Date.now()}` }),
        ),
      );
    }
  } finally {
    sweepInProgress = false;
  }
}

async function startWorker() {
  if (!env.redisUrl) throw new Error('REDIS_URL must be configured to run the OCR worker.');
  await connectDB();
  getReportQueue();
  worker = new Worker(queueName, processReportOcr, {
    connection: redisConnection(null),
    concurrency: OCR_SETTINGS.workerConcurrency,
  });
  worker.on('completed', () => logger.info('A report OCR job completed.'));
  worker.on('failed', (job, error) => {
    logger.error('A report OCR job attempt failed.');
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void markReportFailed(job.data.reportId, error).catch(() => {
        logger.error('The failed report OCR status could not be saved.');
      });
    }
  });
  worker.on('error', () => logger.error('The OCR worker encountered a Redis or processing error.'));

  await sweepStaleReports();
  sweepTimer = setInterval(() => {
    void sweepStaleReports().catch(() => {
      logger.error('The stale report OCR sweep failed.');
    });
  }, OCR_SETTINGS.sweepIntervalMs);
  sweepTimer.unref();
  logger.info(`OCR worker listening to the ocr-processing queue with concurrency ${OCR_SETTINGS.workerConcurrency}.`);
}

async function stopWorker() {
  if (sweepTimer) clearInterval(sweepTimer);
  await worker?.close();
  await closeOcrQueue();
  await mongoose.disconnect();
}

process.once('SIGINT', () => {
  void stopWorker().then(() => process.exit(0)).catch(() => process.exit(1));
});
process.once('SIGTERM', () => {
  void stopWorker().then(() => process.exit(0)).catch(() => process.exit(1));
});

startWorker().catch((error) => {
  logger.error(`OCR worker startup failed: ${error.message}`);
  void stopWorker().catch(() => {});
  process.exitCode = 1;
});
