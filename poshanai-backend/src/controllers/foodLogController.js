import FoodLog from '../models/FoodLog.js';
import {
  assertCatalogLoaded,
  getFoodByCode,
  hasCalorieData,
  scaleNutrients,
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
    calories: plain.calories,
    protein: plain.protein,
    carbs: plain.carbs,
    fat: plain.fat,
    createdAt: plain.createdAt,
  };
}

export const searchFoodCatalog = asyncHandler(async (req, res) => {
  assertCatalogLoaded();
  const foods = searchFoods(req.query.q, req.query.limit);
  return res.json({ success: true, data: { foods } });
});

export const addFood = asyncHandler(async (req, res) => {
  const userId = req.user._id; // never from req.body
  const { ifctCode, grams, date } = req.body;

  assertCatalogLoaded();
  const food = getFoodByCode(ifctCode);
  if (!food) throw httpError(404, 'FOOD_NOT_FOUND', 'That food was not found in the IFCT database.');

  if (!hasCalorieData(food)) {
    throw httpError(422, 'FOOD_DATA_INCOMPLETE', 'Calorie data is missing for this food, so it cannot be logged yet.');
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
    grams,
    ...scaleNutrients(food.nutrients, grams),
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
