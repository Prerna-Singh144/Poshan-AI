import DietPlan from '../models/DietPlan.js';
import MealPlan from '../models/MealPlan.js';
import { enhanceDietPlan } from '../services/aiService.js';
import { generateBasicDietPlan } from '../services/dietService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const generateBasic = asyncHandler(async (req, res) => {
  const profile = {
    ...req.body,
    dietType: req.body.dietType === 'non-veg' ? 'nonveg' : req.body.dietType,
  };
  const generated = await enhanceDietPlan(generateBasicDietPlan(profile));
  const dietPlan = await DietPlan.create({ ...generated, userId: req.user._id });
  return res.status(201).json({ success: true, data: dietPlan });
});

export const list = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  const [basicPlans, personalizedPlans] = await Promise.all([
    DietPlan.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    MealPlan.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const plans = [
    ...basicPlans,
    ...personalizedPlans.map((plan) => ({ ...plan, type: 'personalized' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, data: { plans } });
});

export default { generateBasic, list };
