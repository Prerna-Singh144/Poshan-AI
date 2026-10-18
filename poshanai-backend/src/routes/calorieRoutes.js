import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as calorieController from '../controllers/calorieController.js';

const router = Router();

router.get('/maintenance', verifyToken, calorieController.getMaintenance);

export default router;
