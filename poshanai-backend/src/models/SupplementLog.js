import mongoose from 'mongoose';

const supplementLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  supplementName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  vitamins: {
    vitaminD: { type: Number, min: 0, default: 0 },
    b12: { type: Number, min: 0, default: 0 },
    iron: { type: Number, min: 0, default: 0 },
    calcium: { type: Number, min: 0, default: 0 },
  },
}, { timestamps: true, versionKey: false });

supplementLogSchema.index({ userId: 1, date: 1 });

const SupplementLog = mongoose.models.SupplementLog ?? mongoose.model('SupplementLog', supplementLogSchema);
export default SupplementLog;
