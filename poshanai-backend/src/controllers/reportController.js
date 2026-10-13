import { unlink } from 'node:fs/promises';
import path from 'node:path';
import Report from '../models/Report.js';
import { removeUploadedFile, uploadDirectory } from '../middleware/uploadMiddleware.js';
import { enqueueReportOcr, processReportOcr } from '../jobs/ocrQueue.js';
import logger from '../utils/logger.js';

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

function storedFilePath(fileUrl) {
  return path.resolve(uploadDirectory, path.basename(fileUrl));
}

export const upload = asyncHandler(async (req, res) => {
  let report;
  try {
    report = await Report.create({
      userId: req.user._id,
      fileUrl: `uploads/reports/${req.file.filename}`,
      fileType: req.file.mimetype,
      ocrStatus: 'pending',
    });
  } catch (error) {
    try {
      await removeUploadedFile(req.file.path);
    } catch {
      throw httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The uploaded file could not be safely cleaned up.');
    }
    throw error;
  }

  try {
    await enqueueReportOcr(report._id);
    return res.status(202).json({ success: true, data: { report: publicReport(report) } });
  } catch {
    logger.warn('Redis OCR queue is unavailable; processing the report synchronously.');
  }

  report = await processReportOcr(report._id);
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
  return res.json({ success: true, data: { report: publicReport(report, true) } });
});

export const remove = asyncHandler(async (req, res) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!report) throw httpError(404, 'REPORT_NOT_FOUND', 'Report not found.');

  try {
    await unlink(storedFilePath(report.fileUrl));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw httpError(500, 'REPORT_FILE_CLEANUP_FAILED', 'The report record was deleted, but its stored file could not be removed.');
    }
  }

  return res.json({ success: true, data: { id: String(report._id), deleted: true } });
});

export default { upload, list, getById, remove };
