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
  passwordResetTokenTtlMs: 10 * 60 * 1000,
});

export const OTP_SETTINGS = Object.freeze({
  bcryptSaltRounds: 10,
  defaultExpiryMinutes: 5,
  defaultMaxAttempts: 3,
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitRequests: 5,
});

// Adult references use ICMR-NIN RDA 2020. Adolescent references use the
// age-specific ICMR-NIN 2020 summary. E, K, and potassium use the Indian
// references collated by FSSAI where the 2020 table does not specify values.
export const MICRONUTRIENTS = Object.freeze([
  { key: 'vitaminA', nutrient: 'Vitamin A', unit: 'µg' },
  { key: 'vitaminC', nutrient: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD', nutrient: 'Vitamin D', unit: 'IU' },
  { key: 'vitaminE', nutrient: 'Vitamin E', unit: 'mg' },
  { key: 'vitaminK', nutrient: 'Vitamin K', unit: 'µg' },
  { key: 'vitaminB1', nutrient: 'Vitamin B1 (Thiamine)', unit: 'mg' },
  { key: 'vitaminB2', nutrient: 'Vitamin B2 (Riboflavin)', unit: 'mg' },
  { key: 'vitaminB3', nutrient: 'Vitamin B3 (Niacin)', unit: 'mg' },
  { key: 'vitaminB6', nutrient: 'Vitamin B6', unit: 'mg' },
  { key: 'vitaminB9', nutrient: 'Vitamin B9 (Folate)', unit: 'µg DFE' },
  { key: 'vitaminB12', nutrient: 'Vitamin B12', unit: 'µg' },
  { key: 'iron', nutrient: 'Iron', unit: 'mg' },
  { key: 'calcium', nutrient: 'Calcium', unit: 'mg' },
  { key: 'zinc', nutrient: 'Zinc', unit: 'mg' },
  { key: 'magnesium', nutrient: 'Magnesium', unit: 'mg' },
  { key: 'potassium', nutrient: 'Potassium', unit: 'mg' },
]);

const makeRda = (values) => Object.freeze(Object.fromEntries(
  MICRONUTRIENTS.map(({ key }) => [key, values[key] ?? null]),
));

export const MICRONUTRIENT_RDA = Object.freeze({
  male: Object.freeze({
    adolescent13to15: makeRda({ vitaminA: 1000, vitaminC: 50, vitaminD: 600, vitaminE: 10, vitaminK: 55, vitaminB1: 1.9, vitaminB2: 2.6, vitaminB3: 19, vitaminB6: 2.2, vitaminB9: 150, vitaminB12: 1.5, iron: 22, calcium: 1000, zinc: 14.3, magnesium: 335, potassium: 3750 }),
    adolescent16to18: makeRda({ vitaminA: 1000, vitaminC: 60, vitaminD: 600, vitaminE: 10, vitaminK: 55, vitaminB1: 2.2, vitaminB2: 2.7, vitaminB3: 23, vitaminB6: 2.3, vitaminB9: 150, vitaminB12: 1.5, iron: 26, calcium: 1050, zinc: 17.6, magnesium: 405, potassium: 3750 }),
    adult: makeRda({ vitaminA: 1000, vitaminC: 80, vitaminD: 600, vitaminE: 10, vitaminK: 55, vitaminB1: 1.8, vitaminB2: 2.5, vitaminB3: 18, vitaminB6: 2.4, vitaminB9: 300, vitaminB12: 2.2, iron: 19, calcium: 1000, zinc: 17, magnesium: 440, potassium: 3750 }),
  }),
  female: Object.freeze({
    adolescent13to15: makeRda({ vitaminA: 1000, vitaminC: 50, vitaminD: 600, vitaminE: 7.5, vitaminK: 55, vitaminB1: 1.6, vitaminB2: 2, vitaminB3: 16, vitaminB6: 2, vitaminB9: 150, vitaminB12: 1.5, iron: 20, calcium: 1000, zinc: 12.5, magnesium: 335, potassium: 3225 }),
    adolescent16to18: makeRda({ vitaminA: 1000, vitaminC: 60, vitaminD: 600, vitaminE: 7.5, vitaminK: 55, vitaminB1: 2.2, vitaminB2: 2.7, vitaminB3: 23, vitaminB6: 2.3, vitaminB9: 150, vitaminB12: 1.5, iron: 32, calcium: 1050, zinc: 14.2, magnesium: 335, potassium: 3225 }),
    adult: makeRda({ vitaminA: 840, vitaminC: 65, vitaminD: 600, vitaminE: 7.5, vitaminK: 55, vitaminB1: 1.7, vitaminB2: 2.4, vitaminB3: 14, vitaminB6: 1.9, vitaminB9: 220, vitaminB12: 2.2, iron: 29, calcium: 1000, zinc: 13, magnesium: 370, potassium: 3225 }),
  }),
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

export const RETEST_REMINDER_SETTINGS = Object.freeze({
  queueName: 'retest-reminders',
  schedule: '0 9 * * *',
  timezone: 'UTC',
});

export const COMPLIANCE_SETTINGS = Object.freeze({
  policyVersion: '1.0',
  reportRetentionDays: 365,
  retentionWarningDays: 7,
  accountDeletionGraceDays: 30,
});
