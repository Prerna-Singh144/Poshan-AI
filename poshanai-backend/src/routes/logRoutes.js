import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as foodLogController from '../controllers/foodLogController.js';
import { validateAddFood, validateTodayLog } from '../validators/logValidators.js';

const router = Router();

router.post('/add-food', verifyToken, validateAddFood, foodLogController.addFood);
router.get('/today', verifyToken, validateTodayLog, foodLogController.getDailyLog);

export default router;
