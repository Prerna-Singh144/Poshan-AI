import { Router } from 'express';
import * as supplementController from '../controllers/supplementController.js';

const router = Router();

router.get('/list', supplementController.list);

export default router;
