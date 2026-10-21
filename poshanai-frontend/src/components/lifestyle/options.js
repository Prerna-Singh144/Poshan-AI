// Values mirror the backend LifestyleProfile enums (poshanai-backend/src/models/LifestyleProfile.js).
export const DIET_OPTIONS = [
  { value: 'veg', label: 'Vegetarian', hint: 'No meat, fish or eggs', emoji: '🥗' },
  { value: 'non-veg', label: 'Non-vegetarian', hint: 'Includes meat or fish', emoji: '🍗' },
  { value: 'eggetarian', label: 'Eggetarian', hint: 'Vegetarian plus eggs', emoji: '🥚' },
  { value: 'vegan', label: 'Vegan', hint: 'No animal products', emoji: '🌱' },
];

export const TYPICAL_DIET_OPTIONS = [
  'rice', 'roti', 'dal', 'sabzi', 'dairy', 'paneer', 'eggs', 'chicken',
  'fish', 'fruits', 'sweets', 'fast food',
].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));

export const SLEEP_TIME_OPTIONS = [
  { value: 'early', label: 'Early', hint: 'Early to bed, early to rise', emoji: '🌅' },
  { value: 'regular', label: 'Regular', hint: 'Roughly the same time each night', emoji: '🌙' },
  { value: 'late night', label: 'Late night', hint: 'Often sleep very late', emoji: '🦉' },
];

export const SUN_OPTIONS = [
  { value: 'high', label: 'A lot', hint: 'Outdoors in daytime most days', emoji: '☀️' },
  { value: 'moderate', label: 'Some', hint: 'A little time outdoors', emoji: '🌤️' },
  { value: 'low', label: 'Very little', hint: 'Mostly indoors', emoji: '🏢' },
];

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Mostly sitting', hint: 'Desk job, little exercise', emoji: '🪑' },
  { value: 'moderate', label: 'Moderately active', hint: 'Walks or light exercise', emoji: '🚶' },
  { value: 'active', label: 'Very active', hint: 'Regular exercise most days', emoji: '🏃' },
];

export const HABIT_OPTIONS = [
  { value: 'smoking', label: 'Smoking' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'none', label: 'None of these' },
];

export const SYMPTOM_OPTIONS = [
  { value: 'fatigue', label: 'Tiredness / low energy' },
  { value: 'hair fall', label: 'Hair fall' },
  { value: 'bone pain', label: 'Bone pain' },
  { value: 'none', label: 'None of these' },
];

export const STEP_TITLES = ['Consent (DPDP Act)', 'Your diet', 'Your lifestyle', 'Symptoms & habits'];
