import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, userId } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const filter = {};
  if (action) filter.action = action;
  if (userId) filter.userId = userId;

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
