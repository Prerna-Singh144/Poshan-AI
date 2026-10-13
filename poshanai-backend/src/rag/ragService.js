// IFCT 2017 composition values per 100 g edible portion from ICMR-NIN:
// https://www.nin.res.in/ebooks/IFCT2017.pdf. Energy is converted from kJ to kcal,
// mineral values from g to mg, and vitamin D from g to micrograms. IFCT 2017
// does not provide vitamin B12 values; those entries intentionally remain null.
const foodRecords = [
  {
    ifctCode: 'A015',
    foodName: 'Rice, raw, milled',
    regionCode: 6,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 356.36, protein: 7.94, carbs: 78.24, fat: 0.52, iron: 0.65, calcium: 7.49, vitaminD: 0, vitaminB12: null },
  },
  {
    ifctCode: 'B013',
    foodName: 'Lentil, dal',
    regionCode: 6,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: ['legumes'],
    nutrients: { calories: 322.42, protein: 24.35, carbs: 52.53, fat: 0.75, iron: 7.06, calcium: 44.32, vitaminD: 1.31, vitaminB12: null },
  },
  {
    ifctCode: 'B023',
    foodName: 'Ricebean',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: ['legumes'],
    nutrients: { calories: 302.34, protein: 19.97, carbs: 51.26, fat: 0.74, iron: 4.76, calcium: 200, vitaminD: 8.26, vitaminB12: null },
  },
  {
    ifctCode: 'C003',
    foodName: 'Amaranth leaves, red',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 33.46, protein: 3.93, carbs: 2.37, fat: 0.63, iron: 7.25, calcium: 245, vitaminD: 15.1, vitaminB12: null },
  },
  {
    ifctCode: 'C033',
    foodName: 'Spinach',
    regionCode: 6,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 24.38, protein: 2.14, carbs: 2.05, fat: 0.64, iron: 2.95, calcium: 82.29, vitaminD: 0.26, vitaminB12: null },
  },
  {
    ifctCode: 'D009',
    foodName: 'Bottle gourd, elongate, dark green',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 12.91, protein: 0.49, carbs: 2.25, fat: 0.13, iron: 0.34, calcium: 16.64, vitaminD: 0.6, vitaminB12: null },
  },
  {
    ifctCode: 'D065',
    foodName: 'Pumpkin, green, cylindrical',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 24.62, protein: 0.87, carbs: 4.22, fat: 0.18, iron: 0.29, calcium: 24.1, vitaminD: 1.07, vitaminB12: null },
  },
  {
    ifctCode: 'E009',
    foodName: 'Banana, ripe, montham',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 110.66, protein: 1.25, carbs: 24.95, fat: 0.32, iron: 0.4, calcium: 6.77, vitaminD: 0.2, vitaminB12: null },
  },
  {
    ifctCode: 'F007',
    foodName: 'Potato, brown skin, small',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 60.95, protein: 1.35, carbs: 12.9, fat: 0.22, iron: 0.53, calcium: 8.53, vitaminD: 0.22, vitaminB12: null },
  },
  {
    ifctCode: 'F011',
    foodName: 'Radish, round, red skin',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: [],
    nutrients: { calories: 31.07, protein: 0.89, carbs: 6.07, fat: 0.16, iron: 0.42, calcium: 35.76, vitaminD: 0.05, vitaminB12: null },
  },
  {
    ifctCode: 'J001',
    foodName: 'Button mushroom, fresh',
    regionCode: 1,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: ['mushrooms'],
    nutrients: { calories: 27.49, protein: 3.68, carbs: 1.98, fat: 0.42, iron: 0.29, calcium: 18.38, vitaminD: 20.54, vitaminB12: null },
  },
  {
    ifctCode: 'L002',
    foodName: 'Milk, whole, Cow',
    regionCode: 6,
    dietTags: ['veg', 'eggetarian', 'fishetarian'],
    allergens: ['dairy'],
    nutrients: { calories: 72.9, protein: 3.26, carbs: 4.94, fat: 4.48, iron: 0.15, calcium: 118, vitaminD: 1.22, vitaminB12: null },
  },
  {
    ifctCode: 'M009',
    foodName: 'Egg, country hen, whole, boiled',
    regionCode: 1,
    dietTags: ['eggetarian', 'fishetarian'],
    allergens: ['eggs'],
    nutrients: { calories: 183.32, protein: 14.43, carbs: 0, fat: 14.1, iron: 1.73, calcium: 57.79, vitaminD: 2.99, vitaminB12: null },
  },
  {
    ifctCode: 'N005',
    foodName: 'Poultry, chicken, liver',
    regionCode: 1,
    dietTags: ['nonveg'],
    allergens: ['poultry'],
    nutrients: { calories: 123.8, protein: 21.57, carbs: 0, fat: 4.08, iron: 9.92, calcium: 4.1, vitaminD: 2.64, vitaminB12: null },
  },
  {
    ifctCode: 'P004',
    foodName: 'Ari fish',
    regionCode: 1,
    dietTags: ['fishetarian', 'nonveg'],
    allergens: ['fish'],
    nutrients: { calories: 99.19, protein: 22.01, carbs: 0, fat: 1.11, iron: 0.47, calcium: 4.36, vitaminD: 1.04, vitaminB12: null },
  },
];

const regionCodes = new Map();
const regionsByState = {
  Central: ['Chhattisgarh', 'Madhya Pradesh', 'Uttar Pradesh', 'Uttarakhand', 'Uttaranchal'],
  East: ['Bihar', 'Jharkhand', 'Odisha', 'Orissa', 'West Bengal'],
  North: ['Chandigarh', 'Delhi', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Punjab', 'Rajasthan'],
  Northeast: ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'],
  South: ['Andaman & Nicobar Islands', 'Andhra Pradesh', 'Karnataka', 'Kerala', 'Lakshadweep', 'Puducherry', 'Pondicherry', 'Tamil Nadu', 'Telangana'],
  West: ['Dadra & Nagar Haveli', 'Daman & Diu', 'Goa', 'Gujarat', 'Maharashtra'],
};

for (const [index, [region, states]] of Object.entries(regionsByState).entries()) {
  regionCodes.set(region.toLowerCase(), index + 1);
  for (const state of states) regionCodes.set(state.toLowerCase(), index + 1);
}

export const supportedRegions = [...regionCodes.keys()];

const nutrientByDeficiency = {
  'Vitamin D': 'vitaminD',
  'Vitamin B12': 'vitaminB12',
  Iron: 'iron',
  Calcium: 'calcium',
  Hemoglobin: 'iron',
};

const allergyAliases = {
  nuts: ['nuts'],
  peanut: ['peanuts', 'nuts'],
  peanuts: ['peanuts', 'nuts'],
  dairy: ['dairy'],
  milk: ['dairy'],
  eggs: ['eggs'],
  egg: ['eggs'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  soy: ['soy'],
  gluten: ['gluten'],
  wheat: ['gluten'],
  legumes: ['legumes'],
  poultry: ['poultry'],
  mushrooms: ['mushrooms'],
  sesame: ['sesame'],
  seeds: ['seeds'],
};

const round = (value) => Math.round(value * 100) / 100;

// TODO (Member 3): Replace this IFCT sample catalogue with live RAG retrieval.
export function retrieveFoodsForDeficiencies(deficiencies = [], preferences = {}) {
  const dietType = preferences.dietType ?? 'veg';
  const excludedAllergens = new Set(
    (preferences.allergies ?? []).flatMap((allergy) => allergyAliases[allergy.toLowerCase()] ?? [allergy.toLowerCase()]),
  );
  const requestedRegion = preferences.region ? regionCodes.get(preferences.region.toLowerCase()) : null;
  const relevantNutrients = deficiencies
    .map((deficiency) => nutrientByDeficiency[deficiency.nutrient])
    .filter(Boolean);

  return foodRecords
    .filter((food) => dietType === 'nonveg' || food.dietTags.includes(dietType))
    .filter((food) => !food.allergens.some((allergen) => excludedAllergens.has(allergen)))
    .filter((food) => !requestedRegion || food.regionCode === requestedRegion)
    .sort((left, right) => {
      const score = (food) => relevantNutrients.reduce(
        (total, nutrient) => total + (food.nutrients[nutrient] > 0 ? 1 : 0),
        0,
      );
      return score(right) - score(left) || left.ifctCode.localeCompare(right.ifctCode);
    })
    .map(({ ifctCode, foodName, nutrients }) => ({
      ifctCode,
      foodName,
      nutrients: Object.fromEntries(
        Object.entries(nutrients).map(([name, value]) => [name, value === null ? null : round(value)]),
      ),
      servingSize: 100,
    }));
}

// TODO (Member 3): Replace this stub-backed provider when the real RAG service is integrated.
export function getMedicalDisclaimer() {
  return 'PoshanAI provides nutrition awareness and suggestions. It does not diagnose, treat, or replace advice from a qualified healthcare professional.';
}

// TODO (Member 3): Replace this prompt builder with production RAG prompt construction.
export function buildMealPlanPrompt(userProfile, deficiencies, retrievedFoods) {
  return [
    'Create a practical 7-day Indian meal plan using only the supplied IFCT food records and the user preferences.',
    'Return only a JSON object shaped as {"meals":[{"day":1,"mealType":"breakfast","items":[{"ifctCode":"A015","quantityGrams":100}]}]}.',
    'Include at least one meal for each day from 1 through 7. Use realistic portions and vary meals where possible.',
    'Do not include food names or nutrient amounts in the response. The server resolves each IFCT code and computes the portion nutrients.',
    'Do not invent foods or IFCT codes; every ifctCode must be copied from the supplied records.',
    'Vitamin B12 is unavailable in some IFCT records and must not be inferred or fabricated.',
    'Do not diagnose, treat, or claim that foods will correct a laboratory result. Do not recommend supplements or medication.',
    'Sanitized user preferences:',
    JSON.stringify(userProfile),
    'Reported below-reference markers (informational only):',
    JSON.stringify(deficiencies),
    'Retrieved IFCT foods (nutrients per 100 g; null means not reported):',
    JSON.stringify(retrievedFoods),
  ].join('\n');
}
