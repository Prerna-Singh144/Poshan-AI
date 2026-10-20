import { getFoodByIfctCode, getIfctNutrientAvailability } from '../rag/ragService.js';
import httpError from '../utils/httpError.js';
import { MICRONUTRIENTS, MICRONUTRIENT_RDA } from '../config/constants.js';

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function getTodayDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildFoodEntry({ mealType, ifctCode, quantityGrams }) {
  const food = getFoodByIfctCode(ifctCode);
  if (!food) throw httpError(404, 'FOOD_NOT_FOUND', 'No IFCT food matches the supplied code.');

  const scale = quantityGrams / 100;
  return {
    mealType,
    foodName: food.foodName,
    ifctCode: food.ifctCode,
    quantityGrams,
    calories: round(food.nutrients.calories * scale),
    protein: round(food.nutrients.protein * scale),
    carbs: round(food.nutrients.carbs * scale),
    fat: round(food.nutrients.fat * scale),
    micronutrients: Object.fromEntries(MICRONUTRIENTS.map(({ key }) => {
      const value = food.nutrients[key];
      if (value === null || value === undefined) return [key, null];
      const unitFactor = key === 'vitaminD' ? 40 : 1;
      return [key, round(value * unitFactor * scale)];
    })),
  };
}

export function sumFoodEntries(meals = []) {
  return meals.reduce((totals, meal) => ({
    calories: round(totals.calories + meal.calories),
    protein: round(totals.protein + meal.protein),
    carbs: round(totals.carbs + meal.carbs),
    fat: round(totals.fat + meal.fat),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function sumMicronutrients(meals = [], supplements = []) {
  const totals = Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [key, 0]));
  const catalogAvailability = getIfctNutrientAvailability();
  const known = Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [key, catalogAvailability[key] === true]));
  for (const meal of meals) {
    // Re-read legacy entries that predate micronutrient persistence.
    const entry = meal.micronutrients ?? buildFoodEntry({
      mealType: meal.mealType,
      ifctCode: meal.ifctCode,
      quantityGrams: meal.quantityGrams,
    }).micronutrients;
    for (const { key } of MICRONUTRIENTS) {
      if (entry[key] === null || entry[key] === undefined) known[key] = false;
      else totals[key] += entry[key];
    }
  }
  for (const supplement of supplements) {
    for (const { key } of MICRONUTRIENTS) {
      const value = key === 'vitaminB12'
        ? supplement.vitamins?.vitaminB12 ?? supplement.vitamins?.b12 ?? 0
        : supplement.vitamins?.[key] ?? 0;
      totals[key] += value;
    }
  }
  return Object.fromEntries(MICRONUTRIENTS.map(({ key }) => [key, known[key] ? round(totals[key]) : null]));
}

export function getMicronutrientRda(profile = {}) {
  const { age, gender } = profile;
  if (!Number.isFinite(age) || age < 13 || !MICRONUTRIENT_RDA[gender]) return null;
  const ageGroup = age <= 15 ? 'adolescent13to15' : age <= 18 ? 'adolescent16to18' : 'adult';
  return MICRONUTRIENT_RDA[gender][ageGroup];
}

export function compareMicronutrientsToRda(totals, profile = {}) {
  const rdaValues = getMicronutrientRda(profile);
  return MICRONUTRIENTS.map(({ nutrient, key, unit }) => {
    const consumed = totals[key];
    const rda = rdaValues?.[key] ?? null;
    return {
      nutrient,
      key,
      consumed,
      unit,
      rda,
      dataUnavailable: consumed === null || consumed === undefined,
      progressPercent: consumed === null || rda === null ? null : round((consumed / rda) * 100),
      status: consumed === null || consumed === undefined || rda === null
        ? 'unknown'
        : consumed < rda ? 'below_rda' : 'meets_rda',
    };
  });
}

export default {
  getTodayDateKey,
  buildFoodEntry,
  sumFoodEntries,
  sumMicronutrients,
  getMicronutrientRda,
  compareMicronutrientsToRda,
};
