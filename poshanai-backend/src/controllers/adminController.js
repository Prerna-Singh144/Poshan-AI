import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) {
    filter.action = req.query.action;
  }
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: {
      auditLogs: logs.map((log) => ({
        id: log._id,
        userId: log.userId,
        action: log.action,
        ip: log.ip,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        metadata: log.metadata,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export default { getAuditLogs };
