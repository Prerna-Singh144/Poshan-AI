import Report from '../models/Report.js';
import { extractTextFromReport } from './ocrService.js';
import { normalizeBiomarkerValue } from './reportParser.js';
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
  // Hydrate the current document and save through Mongoose middleware. The
  // encryption plugin only encrypts rawOcrText on document save; updateOne()
  // bypasses that middleware and can leave stale ciphertext or plaintext.
  const completedReport = await Report.findOne({
    _id: report._id,
    ocrStatus: 'processing',
    processingStartedAt,
  });
  if (!completedReport) return;

  completedReport.ocrStatus = 'completed';
  completedReport.reviewStatus = 'pending';
  completedReport.rawOcrText = result.rawText;
  completedReport.extractedValues = result.extractedValues.map((value) => {
    const normalized = normalizeBiomarkerValue(value.nutrient, value.value, value.unit);
    return {
      ...value,
      normalizedValue: normalized.value,
      normalizedUnit: normalized.unit,
    };
  });
  completedReport.processedAt = new Date();
  completedReport.processingStartedAt = null;
  completedReport.ocrError = null;

  await completedReport.save();
  return completedReport;
}
