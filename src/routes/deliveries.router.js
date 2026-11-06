import { Router } from 'express';
import { deliveriesController } from '../controllers/deliveries.controller.js';

const router = Router();

router.get('/', deliveriesController.getAll);
router.get('/:id', deliveriesController.getById);
router.post('/', deliveriesController.create);

export default router;
