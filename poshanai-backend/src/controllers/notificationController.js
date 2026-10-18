import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .select('_id type title message readAt createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    success: true,
    data: { notifications },
  });
});

export default { listNotifications };
