import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

export async function logAuditEvent({
  userId = null,
  action,
  req = null,
  ip = null,
  userAgent = null,
  metadata = {},
}) {
  try {
    const clientIp = ip ?? req?.ip ?? null;
    const clientUserAgent = userAgent ?? req?.get('user-agent') ?? null;
    const effectiveUserId = userId ?? req?.user?._id ?? req?.user?.id ?? null;

    const auditEntry = await AuditLog.create({
      userId: effectiveUserId,
      action,
      ip: clientIp,
      userAgent: clientUserAgent,
      timestamp: new Date(),
      metadata,
    });
    return auditEntry;
  } catch (error) {
    logger.error('Failed to persist audit log entry:', error);
    return null;
  }
}

export default { logAuditEvent };
