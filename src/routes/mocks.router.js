import { Router } from 'express';
import { mocksController } from '../controllers/mocks.controller.js';

const router = Router();

router.get('/users', mocksController.getUsers);
router.get('/mockingusers', mocksController.getUsers);
router.get('/drivers', mocksController.getDrivers);
router.get('/orders', mocksController.getOrders);
router.get('/mockingorders', mocksController.getOrders);
router.get('/deliveries', mocksController.getDeliveries);

router.post('/seed', mocksController.seed);
router.post('/generateData', mocksController.seed);

export default router;
