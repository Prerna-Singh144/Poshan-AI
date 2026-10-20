import { Router } from 'express';
import * as supplementController from '../controllers/supplementController.js';

const router = Router();

// Public, read-only catalog; it contains no user-specific supplement logs.
router.get('/list', supplementController.list);

export default router;
