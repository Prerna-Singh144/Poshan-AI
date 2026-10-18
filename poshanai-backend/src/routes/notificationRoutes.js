import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.get('/', verifyToken, notificationController.listNotifications);

export default router;
