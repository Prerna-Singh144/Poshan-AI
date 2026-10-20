import { ZipArchive } from 'archiver';
import User from '../models/User.js';
import Report from '../models/Report.js';
import MealPlan from '../models/MealPlan.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { COMPLIANCE_SETTINGS } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';
import { getFileBuffer } from '../services/storageService.js';
import { env } from '../config/env.js';

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
  res.clearCookie(env.refreshCookiePresenceName, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  return res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      consent: user.consent,
      status: user.status,
      deletedAt: user.deletedAt,
      deletionScheduledAt: user.deletionScheduledAt,
      createdAt: user.createdAt,
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  if (req.body.name) {
    user.name = req.body.name.trim();
  }
  if (req.body.profile) {
    user.profile = { ...(user.profile?.toObject() ?? {}), ...req.body.profile };
  }

  const policyVersionChanged = user.consent?.version !== COMPLIANCE_SETTINGS.policyVersion;
  if (policyVersionChanged) {
    if (req.body.consent !== true && req.body.consent?.given !== true) {
      throw httpError(
        400,
        'CONSENT_REQUIRED',
        `Privacy policy has been updated to version ${COMPLIANCE_SETTINGS.policyVersion}. Please accept the updated policy to continue.`,
      );
    }
    user.consent = {
      given: true,
      givenAt: new Date(),
      version: COMPLIANCE_SETTINGS.policyVersion,
    };
  } else if (req.body.consent === true || req.body.consent?.given === true) {
    user.consent = {
      given: true,
      givenAt: new Date(),
      version: COMPLIANCE_SETTINGS.policyVersion,
    };
  }

  await user.save();
  await logAuditEvent({
    userId: user._id,
    action: 'profile_update',
    req,
    metadata: { policyVersionChanged, consentVersion: user.consent.version },
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      consent: user.consent,
      status: user.status,
    },
  });
});

export const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).lean();
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  const [reports, mealPlans] = await Promise.all([
    Report.find({ userId }).lean(),
    MealPlan.find({ userId }).lean(),
  ]);

  const sanitizedUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    consent: user.consent,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    regulation: "Digital Personal Data Protection (DPDP) Act, India",
    user: sanitizedUser,
    reports: reports.map((r) => ({
      id: r._id,
      fileType: r.fileType,
      ocrStatus: r.ocrStatus,
      reviewStatus: r.reviewStatus,
      extractedValues: r.extractedValues,
      uploadedAt: r.uploadedAt,
      processedAt: r.processedAt,
    })),
    mealPlans: mealPlans.map((m) => ({
      id: m._id,
      reportId: m.reportId,
      title: m.title,
      targetDeficiencies: m.targetDeficiencies,
      planDurationDays: m.planDurationDays,
      meals: m.meals,
      disclaimer: m.disclaimer,
      status: m.status,
      generatedAt: m.generatedAt,
    })),
  };

  const archive = new ZipArchive({ zlib: { level: 9 } });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="poshanai-data-export-${user._id}-${Date.now()}.zip"`,
  });

  archive.pipe(res);
  archive.append(JSON.stringify(exportPayload, null, 2), { name: 'data.json' });

  for (const report of reports) {
    try {
      const fileBuffer = await getFileBuffer(report.fileUrl);
      const ext = report.fileType === 'application/pdf' ? 'pdf' : report.fileType === 'image/png' ? 'png' : 'jpg';
      archive.append(fileBuffer, { name: `reports/report-${report._id}.${ext}` });
    } catch {
      // If file cannot be read from storage, the structured data.json is still preserved
    }
  }

  await archive.finalize();

  await logAuditEvent({
    userId,
    action: 'export',
    req,
    metadata: { reportsCount: reports.length, mealPlansCount: mealPlans.length },
  });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw httpError(400, 'PASSWORD_REQUIRED', 'Password confirmation is required to delete your account.');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found.');

  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Password confirmation failed.');
  }

  const now = new Date();
  const scheduledDeletion = new Date(now.getTime() + COMPLIANCE_SETTINGS.accountDeletionGraceDays * 24 * 60 * 60 * 1000);

  user.status = 'pending_deletion';
  user.deletedAt = now;
  user.deletionScheduledAt = scheduledDeletion;
  user.refreshTokens = [];
  await user.save();

  clearRefreshCookie(res);

  await logAuditEvent({
    userId: user._id,
    action: 'delete',
    req,
    metadata: {
      mode: 'soft_delete_scheduled',
      scheduledHardDeleteAt: scheduledDeletion.toISOString(),
      gracePeriodDays: COMPLIANCE_SETTINGS.accountDeletionGraceDays,
    },
  });

  return res.json({
    success: true,
    data: {
      message: `Account scheduled for deletion in ${COMPLIANCE_SETTINGS.accountDeletionGraceDays} days. All data will be permanently purged on ${scheduledDeletion.toISOString()}.`,
      deletionScheduledAt: scheduledDeletion,
    },
  });
});

export default {
  getProfile,
  updateProfile,
  exportUserData,
  deleteAccount,
};
