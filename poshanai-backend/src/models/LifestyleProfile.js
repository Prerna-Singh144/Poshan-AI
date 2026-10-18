import mongoose from 'mongoose';

const lifestyleProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    age: { type: Number, min: 13, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    weightKg: { type: Number, min: 20, max: 200 },
    heightCm: { type: Number, min: 100, max: 250 },
    dietType: { type: String, enum: ['veg', 'non-veg', 'vegan', 'eggetarian'] },
    region: { type: String, trim: true, maxlength: 100 },
  },
  { timestamps: true, versionKey: false },
);

lifestyleProfileSchema.index({ userId: 1 }, { unique: true });

const LifestyleProfile = mongoose.models.LifestyleProfile
  ?? mongoose.model('LifestyleProfile', lifestyleProfileSchema);
export default LifestyleProfile;
