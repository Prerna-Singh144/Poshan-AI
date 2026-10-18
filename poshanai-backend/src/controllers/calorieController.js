import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { calculateMaintenanceCalories } from '../services/calorieService.js';

export const getMaintenance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('profile');
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  return res.json({
    success: true,
    data: calculateMaintenanceCalories(user.profile),
  });
});

export default { getMaintenance };
