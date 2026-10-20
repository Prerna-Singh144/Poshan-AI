import { Router } from 'express';
import * as foodLogController from '../controllers/foodLogController.js';
import { validateFoodSearch } from '../validators/logValidators.js';

const router = Router();

// Public read-only IFCT catalogue search; contains no user-specific information.
router.get('/', validateFoodSearch, foodLogController.searchFoodCatalog);
router.get('/search', validateFoodSearch, foodLogController.searchFoodCatalog);

export default router;
