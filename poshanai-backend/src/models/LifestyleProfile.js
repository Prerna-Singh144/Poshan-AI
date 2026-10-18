import mongoose from 'mongoose';

const lifestyleProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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
}, { timestamps: true, versionKey: false });

const LifestyleProfile = mongoose.models.LifestyleProfile
  ?? mongoose.model('LifestyleProfile', lifestyleProfileSchema);
export default LifestyleProfile;
