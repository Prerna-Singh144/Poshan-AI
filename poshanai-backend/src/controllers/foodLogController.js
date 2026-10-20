import FoodLog from '../models/FoodLog.js';
import {
  assertCatalogLoaded,
  getFoodByCode,
  hasCalorieData,
  MAX_GRAMS,
  MIN_GRAMS,
  scaleFoodPortion,
  searchFoods,
  sumNutrients,
} from '../services/foodCatalog.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';

const MAX_ENTRIES_PER_DAY = 100;

function publicEntry(entry) {
  const plain = entry.toObject();
  return {
    id: plain._id,
    date: plain.date,
    ifctCode: plain.ifctCode,
    foodName: plain.foodName,
    grams: plain.grams,
    quantity: plain.quantity,
    measure: plain.measure,
    calories: plain.calories,
    protein: plain.protein,
    carbs: plain.carbs,
    fat: plain.fat,
    createdAt: plain.createdAt,
  };
}

export const searchFoodCatalog = asyncHandler(async (req, res) => {
  assertCatalogLoaded();
  const foods = searchFoods(req.query.q, Math.min(Number(req.query.limit) || 20, 20))
    .map(({ nutrients, ...food }) => ({ ...food, ...nutrients, nutrients }));
  return res.json({ success: true, data: foods });
});

export const addFood = asyncHandler(async (req, res) => {
  const userId = req.user._id; // never from req.body
  const { ifctCode, grams, quantity, measure, date } = req.body;

  assertCatalogLoaded();
  const food = getFoodByCode(ifctCode);
  if (!food) throw httpError(404, 'FOOD_NOT_FOUND', 'That food was not found in the IFCT database.');

  if (!hasCalorieData(food)) {
    throw httpError(422, 'FOOD_DATA_INCOMPLETE', 'Calorie data is missing for this food, so it cannot be logged yet.');
  }

  let finalGrams = grams;
  if (quantity !== undefined) {
    const gramsPerUnit = measure === 'grams' ? 1 : food.servingUnits?.[measure];
    if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
      throw httpError(400, 'INVALID_FOOD_MEASURE', 'That serving measure is not available for this food.');
    }
    if (measure !== 'grams' && quantity > 20) {
      throw httpError(400, 'INVALID_FOOD_QUANTITY', 'Serving quantity must be between 1 and 20.');
    }
    finalGrams = Math.round(quantity * gramsPerUnit * 10) / 10;
    if (finalGrams < MIN_GRAMS || finalGrams > MAX_GRAMS) {
      throw httpError(400, 'INVALID_FOOD_QUANTITY', `This portion must be between ${MIN_GRAMS} and ${MAX_GRAMS} g.`);
    }
  }

  const existingCount = await FoodLog.countDocuments({ userId, date });
  if (existingCount >= MAX_ENTRIES_PER_DAY) {
    throw httpError(409, 'DAILY_LOG_LIMIT', 'You have reached the daily limit for logged foods.');
  }

  const entry = await FoodLog.create({
    userId,
    date,
    ifctCode: food.ifctCode,
    foodName: food.foodName,
    grams: finalGrams,
    quantity,
    measure,
    ...scaleFoodPortion(food, finalGrams),
  });
  const entries = await FoodLog.find({ userId, date }).sort({ createdAt: 1 });
  return res.status(201).json({
    success: true,
    data: { entry: publicEntry(entry), totals: sumNutrients(entries.map((item) => item.toObject())) },
  });
});

export const getDailyLog = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { date } = req.query;
  const entries = await FoodLog.find({ userId, date }).sort({ createdAt: 1 });
  return res.json({
    success: true,
    data: {
      date,
      entries: entries.map(publicEntry),
      totals: sumNutrients(entries.map((item) => item.toObject())),
    },
  });
});

export default { searchFoodCatalog, addFood, getDailyLog };
