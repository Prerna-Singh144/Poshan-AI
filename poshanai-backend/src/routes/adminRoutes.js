import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/audit-logs', adminController.getAuditLogs);

export default router;
