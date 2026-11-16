import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/', ordersController.getAll);
router.get('/:id', ordersController.getById);
router.post('/', ordersController.create);
router.patch('/:id/status', ordersController.updateStatus);
router.post('/:id/proof', uploadSingle('proof'), ordersController.addProof);

export default router;
