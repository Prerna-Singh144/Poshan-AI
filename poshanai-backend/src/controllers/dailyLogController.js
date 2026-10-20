import DailyLog from '../models/DailyLog.js';
import SupplementLog from '../models/SupplementLog.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { calculateMaintenanceCalories } from '../services/calorieService.js';
import { searchIfctFoods } from '../rag/ragService.js';
import { parseFoodsFromText } from '../services/aiFoodParserService.js';
import { getSupplementById } from '../services/supplementCatalogService.js';
import { MICRONUTRIENTS } from '../config/constants.js';
import {
  buildFoodEntry,
  compareMicronutrientsToRda,
  getTodayDateKey,
  sumFoodEntries,
  sumMicronutrients,
} from '../services/dailyLogService.js';

export const searchFoods = asyncHandler(async (req, res) => res.json({
  success: true,
  data: { foods: searchIfctFoods(req.query.q) },
}));

export const parseFoods = asyncHandler(async (req, res) => {
  const items = await parseFoodsFromText(req.body.text);
  return res.json({ success: true, data: { items } });
});

export const smartLog = asyncHandler(async (req, res) => {
  const parsedItems = await parseFoodsFromText(req.body.text);
  const items = parsedItems.map((item) => buildFoodEntry(item));
  const totals = sumFoodEntries(items);
  return res.json({ success: true, data: { items, totals } });
});

export const addSupplement = asyncHandler(async (req, res) => {
  const catalogItem = req.body.supplementId ? getSupplementById(req.body.supplementId) : null;
  if (req.body.supplementId && !catalogItem) {
    throw httpError(404, 'SUPPLEMENT_NOT_FOUND', 'Supplement was not found.');
  }
  if (catalogItem && req.body.unit !== catalogItem.unit) {
    throw httpError(422, 'SUPPLEMENT_UNIT_MISMATCH', `Unit must be ${catalogItem.unit} for this supplement.`);
  }
  const vitamins = catalogItem
    ? Object.fromEntries([
      ...MICRONUTRIENTS.map(({ key }) => [
        key,
        catalogItem.vitaminKey === key
          || (key === 'vitaminB12' && catalogItem.vitaminKey === 'b12')
          ? req.body.dosage
          : 0,
      ]),
      ['b12', catalogItem.vitaminKey === 'vitaminB12' || catalogItem.vitaminKey === 'b12' ? req.body.dosage : 0],
    ])
    : req.body.vitamins;
  const supplement = await SupplementLog.create({
    userId: req.user.id,
    date: getTodayDateKey(),
    supplementName: catalogItem?.name ?? req.body.supplementName,
    ...(catalogItem ? {
      supplementId: catalogItem.id,
      dosage: req.body.dosage,
      unit: catalogItem.unit,
    } : {}),
    vitamins,
  });
  return res.status(201).json({
    success: true,
    data: {
      supplement: {
        id: supplement.id,
        date: supplement.date,
        supplementName: supplement.supplementName,
        supplementId: supplement.supplementId,
        dosage: supplement.dosage,
        unit: supplement.unit,
        vitamins: supplement.vitamins,
      },
    },
  });
});

export const addFood = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const date = getTodayDateKey();
  const foodEntry = buildFoodEntry(req.body);
  const dailyLog = await DailyLog.findOneAndUpdate(
    { userId, date },
    { $push: { meals: foodEntry } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  const addedMeal = dailyLog.meals[dailyLog.meals.length - 1];

  return res.status(201).json({
    success: true,
    data: { date, meal: addedMeal },
  });
});

export const getToday = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const date = getTodayDateKey();
  const [dailyLog, supplements, user] = await Promise.all([
    DailyLog.findOne({ userId, date }).lean(),
    SupplementLog.find({ userId, date }).sort({ createdAt: 1 }).lean(),
    User.findById(userId).select('profile'),
  ]);
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  const meals = dailyLog?.meals ?? [];
  const totals = sumFoodEntries(meals);
  const micronutrientTotals = sumMicronutrients(meals, supplements);
  let targetCalories = null;
  try {
    targetCalories = calculateMaintenanceCalories(user.profile).targetCalories;
  } catch (error) {
    if (error.code !== 'CALORIE_PROFILE_INCOMPLETE') throw error;
  }

  return res.json({
    success: true,
    data: {
      date,
      meals,
      supplements: supplements.map(({ _id, supplementName, supplementId, dosage, unit, vitamins }) => ({
        id: _id, supplementName, supplementId, dosage, unit, vitamins,
      })),
      totals,
      micronutrients: {
        totals: micronutrientTotals,
        rdaComparison: compareMicronutrientsToRda(micronutrientTotals, user.profile),
        disclaimer: 'Logged intake compared with ICMR-NIN reference values; unknown nutrient amounts reflect missing IFCT data. This is not a medical diagnosis.',
      },
      calorieComparison: {
        consumed: totals.calories,
        target: targetCalories,
        remaining: targetCalories === null ? null : targetCalories - totals.calories,
      },
    },
  });
});

export const removeFood = asyncHandler(async (req, res) => {
  const dailyLog = await DailyLog.findOne({
    userId: req.user.id,
    'meals._id': req.params.logId,
  });
  if (!dailyLog) throw httpError(404, 'FOOD_LOG_ENTRY_NOT_FOUND', 'Food log entry not found.');

  dailyLog.meals.pull({ _id: req.params.logId });
  await dailyLog.save();
  return res.json({
    success: true,
    data: { deleted: true, logId: req.params.logId, date: dailyLog.date },
  });
});

export default { addFood, addSupplement, searchFoods, parseFoods, smartLog, getToday, removeFood };
