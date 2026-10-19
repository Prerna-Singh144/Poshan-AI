import mongoose from 'mongoose';

const expertSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  photoUrl: { type: String, trim: true, maxlength: 2048, default: null },
  role: { type: String, enum: ['doctor', 'dietitian', 'nutritionist'], required: true, index: true },
  experienceYears: { type: Number, required: true, min: 0, max: 80 },
  specialization: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  availability: { type: [Date], default: [] },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  fees: { type: Number, required: true, min: 0 },
}, { timestamps: true, versionKey: false });

expertSchema.index({ role: 1, specialization: 1, fees: 1 });

const Expert = mongoose.models.Expert ?? mongoose.model('Expert', expertSchema);
export default Expert;
