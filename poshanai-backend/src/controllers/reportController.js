import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { cleanupUploadedFile } from '../middleware/uploadMiddleware.js';
import { enqueueReportOcr } from '../jobs/ocrQueue.js';
import { processReportOcr } from '../services/ocrProcessor.js';
import { deleteFile, getSignedUrl } from '../services/storageService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const ocrFallbackTimeoutMs = 60_000;
const maxReportsPerUser = 50;
const maxUploadBytesPerUser = 500 * 1024 * 1024;

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function publicReport(report, includeOcrText = false) {
  const response = {
    id: String(report._id),
    fileType: report.fileType,
    ocrStatus: report.ocrStatus,
    extractedValues: report.extractedValues,
    uploadedAt: report.uploadedAt,
    processedAt: report.processedAt,
  };
  if (includeOcrText) response.rawOcrText = report.rawOcrText;
  return response;
}

function processReportWithTimeout(reportId) {
  let timeout;
  const timeoutError = new Error('Report OCR exceeded the 60-second development timeout.');
  timeoutError.statusCode = 504;
  timeoutError.code = 'OCR_TIMEOUT';
  return Promise.race([
    processReportOcr(reportId),
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(timeoutError), ocrFallbackTimeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

async function reserveUploadQuota(userId, fileSizeBytes) {
  const user = await User.findById(userId).select('uploadQuotaInitialized');
  if (!user?.uploadQuotaInitialized) {
    const [totals] = await Report.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          uploadCount: { $sum: 1 },
          uploadSizeBytes: { $sum: { $ifNull: ['$fileSizeBytes', 0] } },
        },
      },
    ]);
    await User.updateOne(
      { _id: userId, uploadQuotaInitialized: { $ne: true } },
      {
        $set: {
          uploadCount: totals?.uploadCount ?? 0,
          uploadSizeBytes: totals?.uploadSizeBytes ?? 0,
          uploadQuotaInitialized: true,
        },
      },
    );
  }
  const result = await User.updateOne(
    {
      _id: userId,
      $expr: {
        $and: [
          { $lt: [{ $ifNull: ['$uploadCount', 0] }, maxReportsPerUser] },
          {
            $lte: [
              { $add: [{ $ifNull: ['$uploadSizeBytes', 0] }, fileSizeBytes] },
              maxUploadBytesPerUser,
            ],
          },
        ],
      },
    },
    { $inc: { uploadCount: 1, uploadSizeBytes: fileSizeBytes } },
  );
  if (result.matchedCount !== 1) {
    throw httpError(403, 'REPORT_QUOTA_EXCEEDED', 'Your account has reached the limit of 50 reports or 500 MB of report uploads.');
  }
}

async function releaseUploadQuota(userId, fileSizeBytes) {
  const increments = { uploadCount: -1 };
  if (Number.isFinite(fileSizeBytes) && fileSizeBytes >= 0) {
    increments.uploadSizeBytes = -fileSizeBytes;
  }
  await User.updateOne(
    { _id: userId },
    { $inc: increments },
  );
}

async function removeQueuedReport(report, file) {
  try {
    await cleanupUploadedFile(file);
    await Report.deleteOne({ _id: report._id });
    await releaseUploadQuota(report.userId, report.fileSizeBytes);
  } catch {
    throw httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The queued report could not be safely cleaned up.');
  }
}

export const upload = asyncHandler(async (req, res) => {
  try {
    await reserveUploadQuota(req.user._id, req.file.size);
  } catch (error) {
    try {
      await cleanupUploadedFile(req.file);
    } catch {
      throw httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The uploaded file could not be safely cleaned up.');
    }
    throw error;
  }

  let report;
  try {
    report = await Report.create({
      userId: req.user._id,
      fileUrl: req.file.storageKey,
      fileSizeBytes: req.file.size,
      fileType: req.file.mimetype,
      ocrStatus: 'pending',
    });
  } catch (error) {
    try {
      await cleanupUploadedFile(req.file);
      await releaseUploadQuota(req.user._id, req.file.size);
    } catch {
      throw httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The uploaded file could not be safely cleaned up.');
    }
    throw error;
  }

  try {
    await enqueueReportOcr(report._id);
    return res.status(202).json({ success: true, data: { report: publicReport(report) } });
  } catch {
    if (env.isProduction) {
      logger.warn('Redis OCR queue is unavailable; returning a retryable upload error.');
      await removeQueuedReport(report, req.file);
      res.set('Retry-After', '30');
      throw httpError(503, 'OCR_QUEUE_UNAVAILABLE', 'Report processing is temporarily unavailable. Please retry.');
    }
    logger.warn('Redis OCR queue is unavailable; using the development-only synchronous OCR fallback.');
  }

  try {
    report = await processReportWithTimeout(report._id);
  } catch (error) {
    if (error.code === 'OCR_TIMEOUT') {
      await removeQueuedReport(report, req.file);
    } else {
      await Report.updateOne(
        { _id: report._id, ocrStatus: 'processing' },
        {
          $set: {
            ocrStatus: 'failed',
            ocrError: typeof error.code === 'string' ? error.code : 'OCR_PROCESSING_FAILED',
            processedAt: new Date(),
            processingStartedAt: null,
          },
        },
      );
    }
    throw error;
  }
  if (!report) throw httpError(500, 'REPORT_PROCESSING_FAILED', 'The uploaded report could not be processed.');
  return res.status(201).json({ success: true, data: { report: publicReport(report) } });
});

export const list = asyncHandler(async (req, res) => {
  const reports = await Report.find({ userId: req.user._id }).sort({ uploadedAt: -1 });
  return res.json({ success: true, data: reports.map((report) => publicReport(report)) });
});

export const getById = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
  if (!report) throw httpError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  const reportData = publicReport(report, true);
  const downloadUrl = await getSignedUrl(report.fileUrl);
  if (downloadUrl) reportData.downloadUrl = downloadUrl;
  return res.json({ success: true, data: { report: reportData } });
});

export const remove = asyncHandler(async (req, res) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!report) throw httpError(404, 'REPORT_NOT_FOUND', 'Report not found.');

  let cleanupError;
  try {
    await deleteFile(report.fileUrl);
  } catch (error) {
    cleanupError = error;
  }
  try {
    await releaseUploadQuota(report.userId, report.fileSizeBytes);
  } catch (error) {
    cleanupError ??= error;
  }
  if (cleanupError) {
    throw httpError(500, 'REPORT_FILE_CLEANUP_FAILED', 'The report record was deleted, but its stored file or quota could not be cleaned up.');
  }

  return res.json({ success: true, data: { id: String(report._id), deleted: true } });
});

export default { upload, list, getById, remove };
