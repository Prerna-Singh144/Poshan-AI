import Report from '../models/Report.js';
import { extractTextFromReport } from './ocrService.js';
import { cleanupDownloadedFile, downloadFile } from './storageService.js';

export async function processReportOcr(reportId) {
  const processingStartedAt = new Date();
  const report = await Report.findOneAndUpdate(
    { _id: reportId, ocrStatus: { $in: ['pending', 'processing'] } },
    {
      $set: {
        ocrStatus: 'processing',
        processingStartedAt,
        ocrError: null,
      },
    },
    { new: true },
  );
  if (!report) return;

  const filePath = await downloadFile(report.fileUrl);
  let result;
  try {
    result = await extractTextFromReport(filePath);
  } finally {
    await cleanupDownloadedFile(filePath);
  }
  await Report.updateOne(
    { _id: report._id, ocrStatus: 'processing', processingStartedAt },
    {
      $set: {
        ocrStatus: 'completed',
        rawOcrText: result.rawText,
        extractedValues: result.extractedValues,
        processedAt: new Date(),
        processingStartedAt: null,
        ocrError: null,
      },
    },
  );
  return Report.findById(report._id);
}
