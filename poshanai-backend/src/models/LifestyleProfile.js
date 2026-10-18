import mongoose from 'mongoose';

const lifestyleProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // --- Basic Profile (From Main Branch) ---
    age: { type: Number, min: 13, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    weightKg: { type: Number, min: 20, max: 200 },
    heightCm: { type: Number, min: 100, max: 250 },
    region: { type: String, trim: true, maxlength: 100 },
    
    // --- Lifestyle Onboarding (From Feature Branch) ---
    dietType: { type: String, enum: ['veg', 'non-veg', 'eggetarian', 'vegan'], required: true },
    mealsPerDay: { type: Number, min: 1, max: 10, required: true },
    typicalDiet: { type: [String], default: [] },
    sleepHours: { type: Number, min: 1, max: 16, required: true },
    sleepTime: { type: String, enum: ['early', 'regular', 'late night'], required: true },
    sunExposure: { type: String, enum: ['high', 'moderate', 'low'], required: true },
    activityLevel: { type: String, enum: ['sedentary', 'moderate', 'active'], required: true },
    habits: { type: [String], enum: ['smoking', 'alcohol', 'none'], required: true },
    symptoms: { type: [String], enum: ['fatigue', 'hair fall', 'bone pain', 'none'], required: true },
    consent: { type: Boolean, required: true, validate: (value) => value === true },
  },
  { timestamps: true, versionKey: false }
);

// Ensure one profile per user (From Main Branch)
lifestyleProfileSchema.index({ userId: 1 }, { unique: true });

const LifestyleProfile = mongoose.models.LifestyleProfile
  ?? mongoose.model('LifestyleProfile', lifestyleProfileSchema);

export default LifestyleProfile;