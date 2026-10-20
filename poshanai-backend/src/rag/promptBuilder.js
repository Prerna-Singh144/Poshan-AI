export const mealPlanSystemPrompt =
  'You are a certified Indian nutritionist. Generate a safe, specific 7-day Indian meal plan using STRICTLY the provided IFCT foods. Do not invent foods or nutrient values. State nutrient targets for every meal and return valid JSON.';
const medicalDisclaimer = 'PoshanAI provides nutrition awareness and suggestions. It does not diagnose, treat, or replace advice from a qualified healthcare professional.';

function getVitaminB12PgMl(deficiency) {
  if (deficiency.nutrient !== 'Vitamin B12') return null;
  const value = Number(deficiency.normalizedValue ?? deficiency.value);
  if (!Number.isFinite(value)) return null;
  const unit = String(deficiency.normalizedUnit ?? deficiency.unit ?? '').trim().toLowerCase().replaceAll(' ', '');
  if (['pg/ml', 'pg/mL'.toLowerCase(), 'ng/l'].includes(unit)) return value;
  if (unit === 'ng/ml') return value * 1000;
  return null;
}

export function hasSevereB12Deficiency(deficiencies = []) {
  return deficiencies.some((deficiency) => {
    if (deficiency.nutrient !== 'Vitamin B12' || deficiency.flag && deficiency.flag !== 'low') return false;
    const value = getVitaminB12PgMl(deficiency);
    return value !== null && value < 150;
  });
}

function describeDeficiency(deficiency) {
  const value = deficiency.normalizedValue ?? deficiency.value;
  const unit = deficiency.normalizedUnit ?? deficiency.unit;
  const detail = [deficiency.flag?.toUpperCase(), value !== undefined && value !== null ? `${value}${unit ? ` ${unit}` : ''}` : null]
    .filter(Boolean)
    .join(', ');
  return detail ? `${deficiency.nutrient} (${detail})` : deficiency.nutrient;
}

export function buildMealPlanPrompt(userProfile, deficiencies, retrievedFoods) {
  const profile = {
    ...userProfile,
    age: userProfile.age ?? null,
    weight: userProfile.weight ?? null,
  };
  const allowedFoods = retrievedFoods.map(({ ifctCode, foodName, nutrients }) => ({ ifctCode, foodName, nutrients }));
  const deficiencyList = deficiencies.length
    ? deficiencies.map(describeDeficiency).join('; ')
    : 'no deficiencies were identified in the confirmed report';
  const severeB12 = hasSevereB12Deficiency(deficiencies);

  const outputSchema = {
    meals: [
      {
        day: 1,
        mealType: 'breakfast',
        nutrientTargets: ['Iron'],
        items: [{ ifctCode: allowedFoods[0]?.ifctCode ?? 'IFCT_CODE', foodName: allowedFoods[0]?.foodName ?? 'IFCT food name', quantityGrams: 150 }],
      },
    ],
    supplementGuidance: severeB12
      ? 'Discuss a clinician-supervised vitamin B12 supplement; the clinician must decide whether it is appropriate and determine dose and duration.'
      : '',
    disclaimer: medicalDisclaimer,
  };

  return [
    `The user is deficient in ${deficiencyList}.`,
    'You must generate a 7-day Indian meal plan using IFCT foods that specifically target these deficiencies.',
    'For every meal, explicitly name which nutrient it targets in the nutrientTargets array (for example, ["Iron", "Folate"]). Choose targets based on the listed IFCT foods and their nutrient values; do not claim a nutrient is present when its value is null or unavailable.',
    'Generate meals covering each day from 1 through 7. Use only the exact IFCT food code and food name pairs listed below. Copy both fields exactly; do not combine or rename foods. Each meal item must refer to one listed IFCT food.',
    severeB12
      ? 'SEVERE VITAMIN B12 DEFICIENCY: The report value is below 150 pg/mL. Include a fortified IFCT food only if the supplied IFCT record supports its B12 content. If no such food is available, set supplementGuidance to recommend discussing a clinician-supervised vitamin B12 supplement. Do not invent a dose, prescribe, or encourage self-medication.'
      : 'Set supplementGuidance to an empty string unless a specific, report-supported reason warrants clinician discussion. Do not prescribe supplement doses.',
    'Return only strict JSON matching this format. Include the disclaimer string exactly as shown. Do not use Markdown fences or add commentary.',
    JSON.stringify(outputSchema, null, 2),
    'User profile:',
    JSON.stringify(profile),
    'Reported deficiencies:',
    JSON.stringify(deficiencies),
    'Allowed IFCT foods and their per-100g nutrient values (this is the complete allowed food list):',
    JSON.stringify(allowedFoods),
  ].join('\n');
}

export default { mealPlanSystemPrompt, buildMealPlanPrompt, hasSevereB12Deficiency };
