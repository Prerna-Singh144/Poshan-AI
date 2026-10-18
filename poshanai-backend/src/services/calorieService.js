import httpError from '../utils/httpError.js';

const ACTIVITY_MULTIPLIERS = Object.freeze({
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
});

// Balanced energy split for converting maintenance calories into gram targets.
const MACRO_CALORIE_RATIOS = Object.freeze({ protein: 0.2, carbs: 0.5, fat: 0.3 });

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateMaintenanceCalories(profile) {
  const requiredFields = ['age', 'weightKg', 'heightCm', 'gender', 'activityLevel'];
  const missingFields = requiredFields.filter((field) => profile?.[field] == null);
  if (missingFields.length > 0) {
    throw httpError(
      422,
      'CALORIE_PROFILE_INCOMPLETE',
      `Complete your profile fields to calculate maintenance calories: ${missingFields.join(', ')}.`,
    );
  }

  if (!['male', 'female'].includes(profile.gender)) {
    throw httpError(422, 'CALORIE_GENDER_UNSUPPORTED', 'The Mifflin-St Jeor equation requires a male or female profile value.');
  }
  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  if (!activityMultiplier) {
    throw httpError(422, 'CALORIE_ACTIVITY_UNSUPPORTED', 'Choose sedentary, moderate, or active activity level.');
  }

  const sexAdjustment = profile.gender === 'male' ? 5 : -161;
  const bmr = (10 * profile.weightKg)
    + (6.25 * profile.heightCm)
    - (5 * profile.age)
    + sexAdjustment;
  const tdee = bmr * activityMultiplier;
  const targetCalories = Math.round(tdee);

  return {
    bmr: round(bmr, 2),
    tdee: round(tdee, 2),
    targetCalories,
    macros: {
      protein: round((tdee * MACRO_CALORIE_RATIOS.protein) / 4),
      carbs: round((tdee * MACRO_CALORIE_RATIOS.carbs) / 4),
      fat: round((tdee * MACRO_CALORIE_RATIOS.fat) / 9),
    },
  };
}

export default { calculateMaintenanceCalories };
