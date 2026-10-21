import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: { type: String, required: true, enum: ['login', 'reset-password', 'verify-email'] },
  otpHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, versionKey: false });

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const Otp = mongoose.models.Otp ?? mongoose.model('Otp', otpSchema);
export default Otp;
