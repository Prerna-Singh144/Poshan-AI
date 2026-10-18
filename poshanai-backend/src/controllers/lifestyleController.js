import LifestyleProfile from '../models/LifestyleProfile.js';
import asyncHandler from '../utils/asyncHandler.js';

const disclaimer = 'These suggestions are for awareness only. Discuss any test with a qualified healthcare professional; they are not a diagnosis.';

function buildRecommendations(profile) {
  const recommendations = [];
  if (profile.sunExposure === 'low' || profile.symptoms.includes('bone pain')) {
    recommendations.push({
      testName: 'Vitamin D',
      reason: 'Low sun exposure or bone discomfort may be worth discussing with your doctor when considering vitamin D testing.',
    });
  }
  if (profile.dietType === 'vegan' || (!profile.typicalDiet.some((food) => ['dairy', 'paneer', 'eggs', 'chicken', 'fish'].includes(food)))) {
    recommendations.push({
      testName: 'Vitamin B12',
      reason: 'Your reported diet may include few common sources of vitamin B12. Ask your doctor whether testing is appropriate.',
    });
  }
  if (profile.symptoms.includes('fatigue') || profile.symptoms.includes('hair fall')) {
    recommendations.push({
      testName: 'Complete blood count (CBC)',
      reason: 'You mentioned fatigue or hair fall. A doctor can decide whether a blood count or other evaluation is appropriate.',
    });
  }
  return recommendations;
}

export const saveOnboarding = asyncHandler(async (req, res) => {
  const profile = await LifestyleProfile.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { ...req.body, userId: req.user.id } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return res.status(200).json({ success: true, data: { saved: true, updatedAt: profile.updatedAt } });
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const profile = await LifestyleProfile.findOne({ userId: req.user.id }).lean();
  if (!profile) return res.json({ success: true, data: [] });
  return res.json({ success: true, data: { recommendations: buildRecommendations(profile), disclaimer } });
});

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
  return res.json({
    success: true,
    data: { explanation: explanations[req.body.testName][req.body.language], disclaimer },
  });
});

export default { saveOnboarding, getRecommendations, explainTest };
