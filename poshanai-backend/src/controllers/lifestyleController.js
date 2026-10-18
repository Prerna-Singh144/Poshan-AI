import LifestyleProfile from '../models/LifestyleProfile.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { testRules } from '../services/testRules.js';

const PROFILE_FIELDS = ['age', 'gender', 'weightKg', 'heightCm', 'dietType', 'region'];

function serializeProfile(profile) {
  return Object.fromEntries(PROFILE_FIELDS
    .filter((field) => profile[field] !== undefined)
    .map((field) => [field, profile[field]]));
}

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

  return res.status(200).json({
    success: true,
    data: {
      profile: {
        id: saved.id,
        ...serializeProfile(saved),
        updatedAt: saved.updatedAt,
      },
      suggestions: testRules.rules,
    },
  });
});

export default { saveOnboarding };
