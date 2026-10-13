import mongoose from 'mongoose';

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
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileUrl: { type: String, required: true },
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
    rawOcrText: { type: String, default: '' },
    extractedValues: { type: [extractedValueSchema], default: [] },
    uploadedAt: { type: Date, default: Date.now, required: true },
    processedAt: { type: Date, default: null },
  },
  { versionKey: false },
);

const Report = mongoose.models.Report ?? mongoose.model('Report', reportSchema);
export default Report;
