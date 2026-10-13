import Joi from 'joi';
import MealPlan from '../models/MealPlan.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import {
  buildMealPlanPrompt,
  getMedicalDisclaimer,
  retrieveFoodsForDeficiencies,
} from '../rag/ragService.js';
import logger from '../utils/logger.js';

const aiMealSchema = Joi.object({
  day: Joi.number().integer().min(1).max(7).required(),
  mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  items: Joi.array()
    .items(Joi.object({
      ifctCode: Joi.string().trim().max(12).required(),
      quantityGrams: Joi.number().min(1).max(2000).required(),
    }).unknown(false))
    .min(1)
    .max(6)
    .required(),
}).unknown(false);

const aiResponseSchema = Joi.object({
  meals: Joi.array()
    .items(aiMealSchema)
    .min(7)
    .max(28)
    .custom((meals, helpers) => {
      if (new Set(meals.map(({ day }) => day)).size !== 7) {
        return helpers.error('array.uniqueDays');
      }
      const keys = meals.map(({ day, mealType }) => `${day}:${mealType}`);
      if (new Set(keys).size !== keys.length) {
        return helpers.error('array.duplicateMeals');
      }
      return meals;
    })
    .required(),
}).unknown(false);

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseMealPlanResponse(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw httpError(502, 'AI_RESPONSE_INVALID', 'OmniRoute returned invalid meal-plan JSON.');
  }

  const { error, value } = aiResponseSchema.validate(parsed, { abortEarly: false, convert: true });
  if (error) {
    throw httpError(502, 'AI_RESPONSE_INVALID', 'OmniRoute returned a meal plan with an invalid structure.');
  }
  return value;
}

function getCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n');
  }
  throw httpError(502, 'AI_RESPONSE_INVALID', 'OmniRoute returned no meal-plan content.');
}

async function requestOmniRoute(prompt) {
  if (!env.omniRouteUrl || !env.omniRouteModel) {
    throw httpError(503, 'AI_SERVICE_NOT_CONFIGURED', 'OmniRoute is not configured.');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (env.omniRouteApiKey) {
    headers.Authorization = `Bearer ${env.omniRouteApiKey}`;
  }

  let response;
  try {
    response = await fetch(env.omniRouteUrl, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: env.omniRouteModel,
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition-awareness assistant. Return only valid JSON matching the requested format. Do not diagnose, prescribe, or claim to treat disease.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    logger.warn(`OmniRoute request ${timedOut ? 'timed out' : 'failed to connect'}${error.cause?.code ? ` (${error.cause.code})` : ''}.`);
    throw httpError(
      timedOut ? 504 : 503,
      timedOut ? 'OMNIROUTE_TIMEOUT' : 'OMNIROUTE_UNAVAILABLE',
      timedOut ? 'OmniRoute request timed out.' : 'OmniRoute is unavailable.',
    );
  }

  if (!response.ok) {
    logger.warn(`OmniRoute returned HTTP ${response.status}.`);
    throw httpError(502, 'OMNIROUTE_REQUEST_FAILED', `OmniRoute returned HTTP ${response.status}.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw httpError(502, 'AI_RESPONSE_INVALID', 'OmniRoute returned an invalid response body.');
  }
  return parseMealPlanResponse(getCompletionText(payload));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function buildStoredMeals(generatedMeals, foodByCode) {
  return generatedMeals.map(({ day, mealType, items }) => ({
    day,
    mealType,
    items: items.map(({ ifctCode, quantityGrams }) => {
      const food = foodByCode.get(ifctCode);
      if (!food) {
        throw httpError(502, 'AI_RESPONSE_INVALID', 'OmniRoute selected an IFCT food that was not provided.');
      }

      const nutrients = Object.fromEntries(
        Object.entries(food.nutrients).map(([nutrient, perHundredGrams]) => [
          nutrient,
          perHundredGrams === null
            ? null
            : round((perHundredGrams * quantityGrams) / 100),
        ]),
      );
      return { foodName: food.foodName, ifctCode, quantityGrams, nutrients };
    }),
  }));
}

/**
 * Generates and persists a validated seven-day meal plan for an owned report.
 */
export async function generateMealPlan(userId, reportId, preferences = {}) {
  const user = await User.findById(userId).select('_id').lean();
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User profile not found.');

  const report = await Report.findOne({ _id: reportId, userId });
  if (!report) throw httpError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  if (report.ocrStatus !== 'completed') {
    throw httpError(409, 'REPORT_NOT_READY', 'The report must finish processing before generating a meal plan.');
  }

  const deficiencies = report.extractedValues
    .filter(({ flag }) => flag === 'low')
    .map(({ nutrient }) => ({ nutrient }));
  const foods = retrieveFoodsForDeficiencies(deficiencies, preferences);
  if (foods.length === 0) {
    throw httpError(422, 'NO_IFCT_FOODS_AVAILABLE', 'No IFCT foods match the selected diet, allergies, and region.');
  }

  const profile = {
    dietType: preferences.dietType ?? 'veg',
    allergies: preferences.allergies ?? [],
    region: preferences.region ?? null,
    activityLevel: preferences.activityLevel ?? 'moderate',
  };
  const prompt = buildMealPlanPrompt(profile, deficiencies, foods);
  logger.info('Meal-plan generation started.');
  const generated = await requestOmniRoute(prompt);
  const foodByCode = new Map(foods.map((food) => [food.ifctCode, food]));
  const meals = buildStoredMeals(generated.meals, foodByCode);
  const ragSourcesUsed = [...new Set(meals.flatMap((meal) => meal.items.map((item) => item.ifctCode)))];
  const disclaimer = getMedicalDisclaimer();

  const mealPlan = await MealPlan.create({
    userId,
    reportId,
    targetDeficiencies: deficiencies.map(({ nutrient }) => nutrient),
    planDurationDays: 7,
    meals,
    aiModelUsed: env.omniRouteModel,
    ragSourcesUsed,
    disclaimer,
    status: 'draft',
  });
  logger.info('Meal plan generated and saved.');
  return mealPlan;
}

export { getMedicalDisclaimer };

export default { generateMealPlan, getMedicalDisclaimer };
