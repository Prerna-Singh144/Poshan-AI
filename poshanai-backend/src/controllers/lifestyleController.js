import LifestyleProfile from '../models/LifestyleProfile.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { testRules } from '../services/testRules.js';

const disclaimer = 'These suggestions are for awareness only. Discuss any test with a qualified healthcare professional; they are not a diagnosis.';

// Include all possible fields from both branches
const PROFILE_FIELDS = [
  'age', 'gender', 'weightKg', 'heightCm', 'dietType', 'region',
  'sunExposure', 'symptoms', 'typicalDiet', 'mealsPerDay', 
  'sleepHours', 'sleepTime', 'activityLevel', 'habits', 'consent'
];

function serializeProfile(profile) {
  return Object.fromEntries(PROFILE_FIELDS
    .filter((field) => profile[field] !== undefined)
    .map((field) => [field, profile[field]]));
}

// Fallback logic from feature branch (in case testRules service fails)
function buildRecommendations(profile) {
  const recommendations = [];
  if (profile.sunExposure === 'low' || (profile.symptoms && profile.symptoms.includes('bone pain'))) {
    recommendations.push({
      testName: 'Vitamin D',
      reason: 'Low sun exposure or bone discomfort may be worth discussing with your doctor when considering vitamin D testing.',
    });
  }
  if (profile.dietType === 'vegan' || (profile.typicalDiet && !profile.typicalDiet.some((food) => ['dairy', 'paneer', 'eggs', 'chicken', 'fish'].includes(food)))) {
    recommendations.push({
      testName: 'Vitamin B12',
      reason: 'Your reported diet may include few common sources of vitamin B12. Ask your doctor whether testing is appropriate.',
    });
  }
  if ((profile.symptoms && profile.symptoms.includes('fatigue')) || (profile.symptoms && profile.symptoms.includes('hair fall'))) {
    recommendations.push({
      testName: 'Complete blood count (CBC)',
      reason: 'You mentioned fatigue or hair fall. A doctor can decide whether a blood count or other evaluation is appropriate.',
    });
  }
  return recommendations;
}

// Robust save logic from main branch
export const saveOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const profile = serializeProfile(req.body);
  const update = { $set: profile, $setOnInsert: { userId } };
  const omitted = PROFILE_FIELDS.filter((field) => !Object.hasOwn(profile, field));
  if (omitted.length) update.$unset = Object.fromEntries(omitted.map((field) => [field, 1]));

  let saved;
  try {
    saved = await LifestyleProfile.findOneAndUpdate({ userId }, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    // A concurrent first submission may win the unique userId insert race.
    if (error?.code !== 11000) throw error;
    saved = await LifestyleProfile.findOneAndUpdate({ userId }, update, {
      new: true,
      runValidators: true,
    });
  }
  if (!saved) throw httpError(500, 'LIFESTYLE_PROFILE_SAVE_FAILED', 'Lifestyle profile could not be saved.');

  // Use testRules from main branch, fallback to buildRecommendations if needed
  const suggestions = typeof testRules !== 'undefined' ? testRules.rules : buildRecommendations(saved);

  return res.status(200).json({
    success: true,
    data: {
      profile: {
        id: saved.id,
        ...serializeProfile(saved),
        updatedAt: saved.updatedAt,
      },
      suggestions,
    },
  });
});

// Recommendations logic from feature branch
export const getRecommendations = asyncHandler(async (req, res) => {
  const profile = await LifestyleProfile.findOne({ userId: req.user._id }).lean();
  if (!profile) return res.json({ success: true, data: { recommendations: [], disclaimer } });
  
  const recommendations = typeof testRules !== 'undefined' ? testRules.rules : buildRecommendations(profile);
  
  return res.json({ success: true, data: { recommendations, disclaimer } });
});

// AI Explanation logic from feature branch
export const explainTest = asyncHandler(async (req, res) => {
  const explanations = {
    'Vitamin D': {
      english: 'This test measures vitamin D in your blood. Your answers suggest a topic you could discuss with your doctor; only a clinician can decide whether testing is suitable.',
      hinglish: 'Yeh test blood mein vitamin D level check karta hai. Aapke answers ek discussion point suggest karte hain; test ki zaroorat doctor hi decide karenge.',
    },
    'Vitamin B12': {
      english: 'This test measures vitamin B12 in your blood. Your answers suggest a topic you could discuss with your doctor; only a clinician can decide whether testing is suitable.',
      hinglish: 'Yeh test blood mein vitamin B12 level check karta hai. Aapke answers ek discussion point suggest karte hain; test ki zaroorat doctor hi decide karenge.',
    },
    'Complete blood count (CBC)': {
      english: 'A CBC measures several types of blood cells. Your answers suggest a topic you could discuss with your doctor; only a clinician can decide whether testing is suitable.',
      hinglish: 'CBC blood cells ke baare mein information deta hai. Aapke answers ek discussion point suggest karte hain; test ki zaroorat doctor hi decide karenge.',
    },
  };

  const testName = req.body.testName;
  const language = req.body.language || 'english';
  const explanation = explanations[testName] ? explanations[testName][language] : 'Explanation not available. Please consult a doctor.';

  return res.json({
    success: true,
    data: { explanation, disclaimer },
  });
});

export default { saveOnboarding, getRecommendations, explainTest };
