import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller.js';

const router = Router();

router.get('/', ordersController.getAll);
router.get('/:id', ordersController.getById);
router.post('/', ordersController.create);
router.patch('/:id/status', ordersController.updateStatus);

export default router;
