import mongoose from 'mongoose';
import { MICRONUTRIENTS } from '../config/constants.js';

const micronutrientFields = Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [key, {
  type: Number,
  min: 0,
  default: 0,
}]));

const supplementLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  supplementName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  supplementId: { type: String, trim: true, maxlength: 80 },
  dosage: { type: Number, min: 0 },
  unit: { type: String, trim: true, maxlength: 20 },
  vitamins: {
    ...micronutrientFields,
    b12: { type: Number, min: 0, default: 0 },
  },
}, { timestamps: true, versionKey: false });

supplementLogSchema.index({ userId: 1, date: 1 });

const SupplementLog = mongoose.models.SupplementLog ?? mongoose.model('SupplementLog', supplementLogSchema);
export default SupplementLog;
