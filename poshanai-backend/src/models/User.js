import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    refreshTokenHash: { type: String, default: null, select: false },
    uploadCount: { type: Number, default: 0, min: 0 },
    uploadSizeBytes: { type: Number, default: 0, min: 0 },
    uploadQuotaInitialized: { type: Boolean, default: false, select: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.models.User ?? mongoose.model('User', userSchema);
export default User;
