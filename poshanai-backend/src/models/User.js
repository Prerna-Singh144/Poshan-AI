import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AUTH_SETTINGS } from '../config/constants.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    deviceInfo: { type: String, required: true, maxlength: 256 },
    createdAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: null },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    weightKg: { type: Number },
    heightCm: { type: Number },
    activityLevel: { type: String, enum: ['sedentary', 'moderate', 'active'] },
    dietType: { type: String, enum: ['veg', 'non-veg', 'vegan', 'eggetarian'] },
    region: { type: String },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    profile: { type: profileSchema, default: undefined },
    onboardingCompleted: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    uploadCount: { type: Number, default: 0, min: 0 },
    uploadSizeBytes: { type: Number, default: 0, min: 0 },
    uploadQuotaInitialized: { type: Boolean, default: false, select: false },
    consent: {
      given: { type: Boolean, required: true },
      givenAt: { type: Date, required: true },
      version: { type: String, default: '1.0' },
    },
    status: {
      type: String,
      enum: ['active', 'pending_deletion', 'deleted'],
      default: 'active',
      index: true,
    },
    deletedAt: { type: Date, default: null },
    deletionScheduledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, AUTH_SETTINGS.bcryptSaltRounds);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.models.User ?? mongoose.model('User', userSchema);
export default User;
