import mongoose from 'mongoose';

const foodEntrySchema = new mongoose.Schema({
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true,
  },
  foodName: { type: String, required: true, trim: true },
  ifctCode: { type: String, required: true, trim: true },
  quantityGrams: { type: Number, required: true, min: 1, max: 2000 },
  calories: { type: Number, required: true, min: 0 },
  protein: { type: Number, required: true, min: 0 },
  carbs: { type: Number, required: true, min: 0 },
  fat: { type: Number, required: true, min: 0 },
  micronutrients: {
    vitaminD: { type: Number, min: 0, default: 0 },
    vitaminB12: { type: Number, min: 0, default: null },
    iron: { type: Number, min: 0, default: 0 },
    calcium: { type: Number, min: 0, default: 0 },
  },
});

const dailyLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  meals: { type: [foodEntrySchema], default: [] },
}, { timestamps: true, versionKey: false });

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyLog = mongoose.models.DailyLog ?? mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;
