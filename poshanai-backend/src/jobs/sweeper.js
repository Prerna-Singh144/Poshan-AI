import Report from '../models/Report.js';
import User from '../models/User.js';
import MealPlan from '../models/MealPlan.js';
import LifestyleProfile from '../models/LifestyleProfile.js';
import DailyLog from '../models/DailyLog.js';
import FoodLog from '../models/FoodLog.js';
import SupplementLog from '../models/SupplementLog.js';
import Notification from '../models/Notification.js';
import ExpertAppointment from '../models/ExpertAppointment.js';
import AuditLog from '../models/AuditLog.js';
import { env } from '../config/env.js';
import { COMPLIANCE_SETTINGS } from '../config/constants.js';
import { deleteFile } from '../services/storageService.js';
import { logAuditEvent } from '../services/auditService.js';
import logger from '../utils/logger.js';

export async function sendRetentionWarningEmail(_userEmail, _report) {
  // Notification delivery must never include health identifiers in application logs.
  logger.info('[Notification] Retention notice processed.');
  return true;
}

export async function runRetentionSweep() {
  const now = Date.now();
  const warningWindowDays = env.reportRetentionDays - COMPLIANCE_SETTINGS.retentionWarningDays;
  const warningCutoff = new Date(now - warningWindowDays * 24 * 60 * 60 * 1000);
  const expirationCutoff = new Date(now - env.reportRetentionDays * 24 * 60 * 60 * 1000);

  let reportsWarned = 0;
  let reportsDeleted = 0;

  // 1. Warning phase (7 days prior to deletion)
  const warnableReports = await Report.find({
    uploadedAt: { $lte: warningCutoff, $gt: expirationCutoff },
    retentionWarningSentAt: null,
  });

  for (const report of warnableReports) {
    try {
      const user = await User.findById(report.userId).select('email');
      if (user?.email) {
        await sendRetentionWarningEmail(user.email, report);
      }
      report.retentionWarningSentAt = new Date();
      await report.save();
      reportsWarned++;
    } catch (error) {
      logger.error(`Error sending retention warning for report ${report._id}:`, error);
    }
  }

  // 2. Deletion phase (expired reports)
  const expiredReports = await Report.find({
    uploadedAt: { $lte: expirationCutoff },
  });

  for (const report of expiredReports) {
    try {
      try {
        await deleteFile(report.fileUrl);
      } catch (fileErr) {
        throw fileErr;
      }

      await User.updateOne(
        { _id: report.userId },
        {
          $inc: {
            uploadCount: -1,
            uploadSizeBytes: -(report.fileSizeBytes || 0),
          },
        },
      );

      await Report.deleteOne({ _id: report._id });

      await logAuditEvent({
        userId: report.userId,
        action: 'retention_delete',
        metadata: {
          reportId: report._id,
          uploadedAt: report.uploadedAt,
          retentionPeriodDays: env.reportRetentionDays,
        },
      });

      reportsDeleted++;
    } catch (error) {
      logger.error('Error deleting expired report.', error);
    }
  }

  return { reportsWarned, reportsDeleted };
}

export async function runAccountDeletionSweep() {
  const now = new Date();
  let accountsPurged = 0;

  const usersToPurge = await User.find({
    status: 'pending_deletion',
    deletionScheduledAt: { $lte: now },
  });

  for (const user of usersToPurge) {
    try {
      const userReports = await Report.find({ userId: user._id }).select('fileUrl');
      // Keep the user record pending if any private file cannot be removed; the next sweep retries.
      for (const report of userReports) await deleteFile(report.fileUrl);
      await Promise.all([
        Report.deleteMany({ userId: user._id }),
        MealPlan.deleteMany({ userId: user._id }),
        LifestyleProfile.deleteMany({ userId: user._id }),
        DailyLog.deleteMany({ userId: user._id }),
        FoodLog.deleteMany({ userId: user._id }),
        SupplementLog.deleteMany({ userId: user._id }),
        Notification.deleteMany({ userId: user._id }),
        ExpertAppointment.deleteMany({ userId: user._id }),
        AuditLog.deleteMany({ userId: user._id }),
      ]);
      await User.deleteOne({ _id: user._id });
      accountsPurged++;
    } catch (error) {
      logger.error('Error purging soft-deleted account.', error);
    }
  }

  return { accountsPurged };
}

export async function runAllSweepers() {
  const retention = await runRetentionSweep();
  const accountDeletion = await runAccountDeletionSweep();
  return {
    ...retention,
    ...accountDeletion,
  };
}

export default {
  runRetentionSweep,
  runAccountDeletionSweep,
  runAllSweepers,
  sendRetentionWarningEmail,
};
