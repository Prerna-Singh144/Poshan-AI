import Notification from '../models/Notification.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const RETEST_REMINDER_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function runRetestReminderSweep({ now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - RETEST_REMINDER_DAYS * DAY_MS);
  const reports = await Report.find({
    ocrStatus: 'completed',
    uploadedAt: { $lte: cutoff },
    retestReminderSentAt: null,
  })
    .select('_id userId')
    .lean();

  let remindersCreated = 0;
  for (const report of reports) {
    const userExists = await User.exists({ _id: report.userId, status: 'active' });
    if (!userExists) continue;

    try {
      await Notification.updateOne(
        { userId: report.userId, type: 'retest_reminder', reportId: report._id },
        {
          $setOnInsert: {
            title: 'Retest reminder',
            message: 'This report is over 90 days old. Consider discussing whether follow-up testing is appropriate with your doctor.',
            readAt: null,
          },
        },
        { upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }

    const updated = await Report.updateOne(
      { _id: report._id, retestReminderSentAt: null },
      { $set: { retestReminderSentAt: now } },
    );
    if (updated.modifiedCount > 0) remindersCreated++;
  }

  if (remindersCreated > 0) logger.info(`Created ${remindersCreated} report retest reminder notification(s).`);
  return { remindersCreated };
}
