import mongoose from 'mongoose';
import encrypt from 'mongoose-encryption';
import { env } from '../config/env.js';
import { MICRONUTRIENTS } from '../config/constants.js';

const micronutrientFields = Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [key, {
  type: Number,
  min: 0,
  default: null,
}]));
const micronutrientSchema = new mongoose.Schema(micronutrientFields, { _id: false });

const extractedValueSchema = new mongoose.Schema(
  {
    nutrient: {
      type: String,
      enum: ['Vitamin D', 'Vitamin B12', 'Iron', 'Calcium', 'Hemoglobin'],
      required: true,
    },
    value: { type: Number, required: true },
    unit: { type: String, default: null },
    referenceRange: { type: String, default: null },
    flag: { type: String, enum: ['normal', 'low', 'high', 'unknown'], required: true },
    normalizedValue: { type: Number, default: null },
    normalizedUnit: { type: String, default: null },
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true, min: 0 },
    fileType: {
      type: String,
      enum: ['application/pdf', 'image/jpeg', 'image/png'],
      required: true,
    },
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
    ocrError: { type: String, default: null },
    reviewStatus: { type: String, enum: ['pending', 'confirmed', 'corrected'], default: 'pending', required: true },
    processingStartedAt: { type: Date, default: null },
    rawOcrText: { type: String, default: '' },
    extractedValues: { type: [extractedValueSchema], default: [] },
    nutrientIntake: { type: micronutrientSchema, default: () => ({}) },
    uploadedAt: { type: Date, default: Date.now, required: true },
    processedAt: { type: Date, default: null },
    retentionWarningSentAt: { type: Date, default: null },
    retestReminderSentAt: { type: Date, default: null },
  },
  { versionKey: false },
);

reportSchema.index({ userId: 1, uploadedAt: -1 });
reportSchema.index({ ocrStatus: 1, uploadedAt: 1, retestReminderSentAt: 1 });

reportSchema.plugin(encrypt, {
  encryptionKey: env.encryptionKey,
  signingKey: env.signingKey,
  encryptedFields: ['rawOcrText'],
});

const Report = mongoose.models.Report ?? mongoose.model('Report', reportSchema);
export default Report;
