export const mealPlanSystemPrompt =
  'You are a certified Indian nutritionist. Your ONLY job is to generate a 7-day Indian meal plan using STRICTLY the provided IFCT foods. Do not invent foods. Output MUST be valid JSON.';
const medicalDisclaimer = 'PoshanAI provides nutrition awareness and suggestions. It does not diagnose, treat, or replace advice from a qualified healthcare professional.';

export function buildMealPlanPrompt(userProfile, deficiencies, retrievedFoods) {
  const profile = {
    ...userProfile,
    age: userProfile.age ?? null,
    weight: userProfile.weight ?? null,
  };
  const allowedFoods = retrievedFoods.map(({ ifctCode, foodName }) => ({ ifctCode, foodName }));

  const outputSchema = {
    meals: [
      {
        day: 1,
        mealType: 'breakfast',
        items: [{ ifctCode: 'C033', foodName: 'Rice', quantityGrams: 150 }],
      },
    ],
    disclaimer: medicalDisclaimer,
  };

  return [
    'Generate meals covering each day from 1 through 7. Use only the exact IFCT food code and food name pairs listed below. Copy both fields exactly; do not combine or rename foods. Each meal item must refer to one listed IFCT food.',
    'Return only strict JSON matching this format. Include the disclaimer string exactly as shown. Do not use Markdown fences or add commentary.',
    JSON.stringify(outputSchema, null, 2),
    'User profile:',
    JSON.stringify(profile),
    'Reported deficiencies:',
    JSON.stringify(deficiencies),
    'Allowed IFCT foods (this is the complete allowed food list):',
    JSON.stringify(allowedFoods),
  ].join('\n');
}

export default { mealPlanSystemPrompt, buildMealPlanPrompt };
