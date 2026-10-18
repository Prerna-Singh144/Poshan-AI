import { getFoodByIfctCode } from '../rag/ragService.js';
import httpError from '../utils/httpError.js';

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
    micronutrients: {
      vitaminD: round((food.nutrients.vitaminD ?? 0) * 40 * scale),
      vitaminB12: food.nutrients.vitaminB12 === null || food.nutrients.vitaminB12 === undefined
        ? null
        : round(food.nutrients.vitaminB12 * scale),
      iron: round((food.nutrients.iron ?? 0) * scale),
      calcium: round((food.nutrients.calcium ?? 0) * scale),
    },
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
  const totals = { vitaminD: 0, vitaminB12: 0, iron: 0, calcium: 0 };
  let vitaminB12Known = true;
  for (const meal of meals) {
    // Re-read legacy entries that predate micronutrient persistence.
    const entry = meal.micronutrients ?? buildFoodEntry({
      mealType: meal.mealType,
      ifctCode: meal.ifctCode,
      quantityGrams: meal.quantityGrams,
    }).micronutrients;
    for (const nutrient of ['vitaminD', 'iron', 'calcium']) totals[nutrient] += entry[nutrient] ?? 0;
    if (entry.vitaminB12 === null || entry.vitaminB12 === undefined) vitaminB12Known = false;
    else totals.vitaminB12 += entry.vitaminB12;
  }
  for (const supplement of supplements) {
    totals.vitaminD += supplement.vitamins?.vitaminD ?? 0;
    totals.vitaminB12 += supplement.vitamins?.b12 ?? 0;
    totals.iron += supplement.vitamins?.iron ?? 0;
    totals.calcium += supplement.vitamins?.calcium ?? 0;
  }
  return {
    vitaminD: round(totals.vitaminD),
    vitaminB12: vitaminB12Known ? round(totals.vitaminB12) : null,
    iron: round(totals.iron),
    calcium: round(totals.calcium),
  };
}

export function compareMicronutrientsToRda(totals) {
  const references = [
    { nutrient: 'Vitamin D', key: 'vitaminD', rda: 600, unit: 'IU' },
    { nutrient: 'Vitamin B12', key: 'vitaminB12', rda: 2.2, unit: 'µg' },
    { nutrient: 'Iron', key: 'iron', rda: 17, unit: 'mg' },
    { nutrient: 'Calcium', key: 'calcium', rda: 1000, unit: 'mg' },
  ];
  return references.map(({ nutrient, key, rda, unit }) => {
    const consumed = totals[key];
    return {
      nutrient,
      consumed,
      unit,
      rda,
      status: consumed === null ? 'unknown' : consumed < rda ? 'deficient' : 'meets_rda',
    };
  });
}

export default { getTodayDateKey, buildFoodEntry, sumFoodEntries, sumMicronutrients, compareMicronutrientsToRda };
