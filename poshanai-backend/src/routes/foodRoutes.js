import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as foodLogController from '../controllers/foodLogController.js';
import { validateFoodSearch } from '../validators/logValidators.js';

const router = Router();

router.get('/search', verifyToken, validateFoodSearch, foodLogController.searchFoodCatalog);

export default router;
