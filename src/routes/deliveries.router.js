import { Router } from 'express';
import { deliveriesController } from '../controllers/deliveries.controller.js';

const router = Router();

router.get('/', deliveriesController.getAll);
router.get('/:id', deliveriesController.getById);
router.post('/', deliveriesController.create);
router.patch('/:id/status', deliveriesController.updateStatus);

export default router;
