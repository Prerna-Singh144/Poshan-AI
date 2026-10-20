import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import httpError from '../utils/httpError.js';

const datasetPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/ifct_2017.json');
let foods = [];
try {
  foods = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
} catch {
  // Return a safe service-unavailable response when the packaged catalog is absent.
}

const activityFactors = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const mealNames = ['Breakfast', 'Lunch', 'Dinner', 'Snack 1', 'Snack 2', 'Snack 3', 'Snack 4', 'Snack 5', 'Snack 6', 'Snack 7'];
const macroKeys = ['protein', 'carbs', 'fat'];
const round1 = (value) => Math.round(value * 10) / 10;
const safeNutrient = (food, name) => Number.isFinite(food.nutrients?.[name]) ? food.nutrients[name] : 0;
const normalizedText = (text) => text.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim();

function matchesDiet(food, dietType) {
  if (dietType === 'veg' || dietType === 'vegan') return food.dietTags?.includes('veg');
  if (dietType === 'eggetarian') return food.dietTags?.includes('eggetarian') || food.dietTags?.includes('veg');
  return food.dietTags?.some((tag) => ['nonveg', 'fishetarian', 'eggetarian', 'veg'].includes(tag));
}

function chooseFoods(profile) {
  if (!foods.length) throw httpError(503, 'FOOD_CATALOG_UNAVAILABLE', 'The food database is temporarily unavailable.');
  const dislikes = profile.dislikes.map(normalizedText).filter(Boolean);
  const eligible = foods.filter((food) => food.nutrients?.calories > 0
    && matchesDiet(food, profile.dietType)
    && !(profile.dietType === 'vegan' && /dairy|milk|egg|meat|fish|poultry|animal/i.test(`${food.category} ${food.foodName}`))
    && !dislikes.some((dislike) => normalizedText(food.foodName).includes(dislike)));

  const cerealCategory = /cereal|millet|grain/i;
  const groups = [
    eligible.filter((food) => cerealCategory.test(`${food.category} ${food.foodName}`)),
    eligible.filter((food) => /grain legumes|milk and milk products|egg and egg products|poultry|animal meat|marine fish|marine shellfish|marine mollusks|fresh water fish/i.test(food.category)),
    eligible.filter((food) => /green leafy vegetables|other vegetables|fruits|roots and tubers/i.test(food.category)),
  ];
  if (groups.some((group) => group.length === 0)) {
    // Narrow/novel dislikes should still produce a usable plan when the IFCT catalog has options.
    const fallback = eligible.filter((food) => !/oil|fat|ghee|sugar|jaggery|salt|spice/i.test(`${food.category} ${food.foodName}`));
    if (!fallback.length) throw httpError(422, 'NO_MATCHING_FOODS', 'No IFCT foods match the selected diet and dislikes.');
    return [fallback, fallback, fallback];
  }
  return groups;
}

function calculateTargetCalories(profile) {
  const genderOffset = profile.gender === 'male' ? 5 : profile.gender === 'female' ? -161 : -78;
  const bmr = (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * profile.age) + genderOffset;
  const tdee = bmr * activityFactors[profile.activityLevel];
  // Moderate general-purpose adjustment; generated plans are educational, not medical advice.
  const multiplier = profile.goal === 'lose' ? 0.85 : profile.goal === 'gain' ? 1.1 : 1;
  return Math.round(tdee * multiplier);
}

function planPortion(food, calories) {
  const quantity = Math.min(2000, Math.max(1, round1((calories * 100) / food.nutrients.calories)));
  const factor = quantity / 100;
  return {
    quantity,
    calories: round1(safeNutrient(food, 'calories') * factor),
    macros: Object.fromEntries(macroKeys.map((key) => [key, round1(safeNutrient(food, key) * factor)])),
  };
}

/** Create a basic IFCT-based plan and calculate nutrition from actual selected portions. */
export function generateBasicDietPlan(profile) {
  const groups = chooseFoods(profile);
  const targetCalories = calculateTargetCalories(profile);
  const mealShares = profile.mealsPerDay === 1
    ? [1]
    : Array.from({ length: profile.mealsPerDay }, (_, index) => index === 0 ? 0.3 : 0.7 / (profile.mealsPerDay - 1));
  const portions = [0.65, 0.25, 0.1];
  const meals = mealShares.map((share, mealIndex) => {
    const mealTarget = targetCalories * share;
    const items = groups.map((group, groupIndex) => {
      const food = group[mealIndex % group.length];
      const portion = planPortion(food, mealTarget * portions[groupIndex]);
      return { foodName: food.foodName, ifctCode: food.ifctCode, quantity: portion.quantity, ...portion };
    });
    const totals = items.reduce((sum, item) => ({
      calories: sum.calories + item.calories,
      ...Object.fromEntries(macroKeys.map((key) => [key, sum[key] + item.macros[key]])),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return {
      mealName: mealNames[mealIndex],
      calories: round1(totals.calories),
      macros: Object.fromEntries(macroKeys.map((key) => [key, round1(totals[key])])),
      items: items.map(({ foodName, ifctCode, quantity }) => ({ foodName, ifctCode, quantity })),
    };
  });
  const macros = Object.fromEntries(macroKeys.map((key) => [
    key,
    round1(meals.reduce((sum, meal) => sum + meal.macros[key], 0)),
  ]));
  return {
    reportId: null,
    goal: profile.goal,
    targetCalories,
    macros,
    meals,
    type: 'basic',
    profile,
    disclaimer: 'This general nutrition plan is educational and is not medical advice. Consult a qualified healthcare professional for individual dietary needs.',
  };
}

export default { generateBasicDietPlan };
