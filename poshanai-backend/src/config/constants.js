export const RATE_LIMITS = Object.freeze({
  apiWindowMs: 15 * 60 * 1000,
  apiRequests: 100,
  authWindowMs: 15 * 60 * 1000,
  authRequests: 5,
});

export const AUTH_SETTINGS = Object.freeze({
  bcryptSaltRounds: 12,
  refreshCookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxRefreshSessions: 5,
});

export const UPLOAD_SETTINGS = Object.freeze({
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFiles: 1,
  maxFields: 0,
  maxReportsPerUser: 50,
  maxBytesPerUser: 500 * 1024 * 1024,
});

export const OCR_SETTINGS = Object.freeze({
  queueName: 'ocr-processing',
  queueConnectTimeoutMs: 1000,
  queueConnectionRetryCount: 2,
  queueConnectionRetryDelayMs: 100,
  language: 'eng+hin',
  maxPdfPages: 25,
  maxPdfPagePixels: 40_000_000,
  pdfRenderScale: 2,
  fallbackTimeoutMs: 60_000,
  queueAttempts: 3,
  retryDelayMs: 2000,
  removeOnComplete: 100,
  removeOnFail: 500,
  workerConcurrency: 2,
  processingTimeoutMs: 10 * 60 * 1000,
  sweepIntervalMs: 5 * 60 * 1000,
});

export const COMPLIANCE_SETTINGS = Object.freeze({
  policyVersion: '1.0',
  reportRetentionDays: 365,
  retentionWarningDays: 7,
  accountDeletionGraceDays: 30,
});
