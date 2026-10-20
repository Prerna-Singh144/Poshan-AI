import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as foodLogController from '../controllers/foodLogController.js';
import { validateAddFood, validateLogPagination, validateTodayLog } from '../validators/logValidators.js';

const router = Router();

router.post('/add-food', verifyToken, validateAddFood, foodLogController.addFood);
router.get('/', verifyToken, validateLogPagination, foodLogController.listLogs);
router.get('/today', verifyToken, validateTodayLog, foodLogController.getDailyLog);

export default router;
