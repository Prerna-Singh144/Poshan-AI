import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import httpError from '../utils/httpError.js';
import logger from '../utils/logger.js';

const datasetPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/ifct_2017.json',
);

let foods = [];
try {
  foods = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
} catch (error) {
  logger.error('Failed to load IFCT dataset for food search', error);
}

const foodsByCode = new Map(foods.map((food) => [food.ifctCode, food]));
export const hasCalorieData = (food) => Number(food?.nutrients?.calories) > 0;

// The IFCT build script writes 0 kcal when energy is missing (e.g. cooking oils). Those foods are
// kept out of search so they cannot silently under-count a diary; adding one is rejected too.
const searchIndex = foods
  .filter(hasCalorieData)
  .map((food) => ({ food, name: String(food.foodName).toLowerCase() }));

export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;

const round1 = (value) => Math.round(value * 10) / 10;
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** Macro values per 100 g, as stored in the IFCT dataset. */
function publicFood({ ifctCode, foodName, category, nutrients, servingUnits }) {
  return {
    ifctCode,
    foodName,
    category,
    ...(servingUnits ? { servingUnits } : {}),
    nutrients: {
      calories: toNumber(nutrients?.calories),
      protein: toNumber(nutrients?.protein),
      carbs: toNumber(nutrients?.carbs),
      fat: toNumber(nutrients?.fat),
    },
  };
}

export function assertCatalogLoaded() {
  if (foods.length === 0) {
    throw httpError(503, 'FOOD_CATALOG_UNAVAILABLE', 'The food database is temporarily unavailable.');
  }
}

export function getFoodByCode(ifctCode) {
  const food = foodsByCode.get(ifctCode);
  return food ? publicFood(food) : null;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Case-insensitive search by food name. Every word typed must start a word in the name
 * ("oil" will not match "boiled"). Names whose first word is the query rank first, then names
 * that start with the query, then the rest.
 */
export function searchFoods(query, limit = 10, index = searchIndex) {
  const tokens = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const joined = tokens.join(' ');
  const wordStart = tokens.map((token) => new RegExp(`(^|[\\s,()/-])${escapeRegExp(token)}`));
  const firstWord = new RegExp(`^${escapeRegExp(tokens[0])}(?![a-z])`);

  const scored = [];
  for (const entry of index) {
    if (!wordStart.every((pattern) => pattern.test(entry.name))) continue;
    let score = 2;
    if (firstWord.test(entry.name)) score = 0;
    else if (entry.name.startsWith(joined)) score = 1;
    scored.push({ entry, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.entry.name.length - b.entry.name.length ||
      a.entry.name.localeCompare(b.entry.name),
  );
  return scored.slice(0, limit).map(({ entry }) => publicFood(entry.food));
}

/** Scales per-100 g macros to a portion size. Nutrition values are always computed server-side. */
export function scaleNutrients(per100g, grams) {
  const factor = grams / 100;
  return {
    calories: round1(toNumber(per100g.calories) * factor),
    protein: round1(toNumber(per100g.protein) * factor),
    carbs: round1(toNumber(per100g.carbs) * factor),
    fat: round1(toNumber(per100g.fat) * factor),
  };
}

/** Scales all macros from IFCT per-100 g values to the final portion size. */
export function scaleFoodPortion(food, grams) {
  return scaleNutrients(food.nutrients, grams);
}

export function sumNutrients(entries) {
  const totals = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + toNumber(entry.calories),
      protein: sum.protein + toNumber(entry.protein),
      carbs: sum.carbs + toNumber(entry.carbs),
      fat: sum.fat + toNumber(entry.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: round1(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  };
}

export default { searchFoods, getFoodByCode, scaleFoodPortion, scaleNutrients, sumNutrients, assertCatalogLoaded };
