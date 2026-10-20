import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  foodName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, max: 2000 },
  ifctCode: { type: String, required: true, trim: true },
}, { _id: false });

const mealSchema = new mongoose.Schema({
  mealName: { type: String, required: true, trim: true },
  swapSuggestion: { type: String, trim: true, maxlength: 240, default: null },
  calories: { type: Number, required: true, min: 0 },
  macros: {
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  items: { type: [itemSchema], required: true, validate: (items) => items.length > 0 },
}, { _id: false });

const dietPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null, index: true },
  goal: { type: String, enum: ['lose', 'maintain', 'gain'], required: true },
  targetCalories: { type: Number, required: true, min: 1 },
  macros: {
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  meals: { type: [mealSchema], required: true, validate: (meals) => meals.length > 0 },
  type: { type: String, enum: ['basic', 'personalized'], required: true, default: 'basic' },
  profile: {
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    weightKg: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    activityLevel: { type: String, required: true },
    dietType: { type: String, required: true },
    mealsPerDay: { type: Number, required: true },
    dislikes: { type: [String], default: [] },
  },
  disclaimer: { type: String, required: true },
}, { timestamps: true, versionKey: false, collection: 'dietplans' });

const DietPlan = mongoose.models.DietPlan ?? mongoose.model('DietPlan', dietPlanSchema);

export default DietPlan;
