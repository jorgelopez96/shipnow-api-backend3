import { Router } from 'express';
import { loggerTestController } from '../controllers/logger-test.controller.js';

const router = Router();

router.get('/', loggerTestController.generateLogs);

export default router;
