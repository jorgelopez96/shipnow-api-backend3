import { Router } from 'express';
import { productsController } from '../controllers/products.controller.js';

const router = Router();

router.get('/', productsController.getAll);
router.get('/:id', productsController.getById);
router.post('/', productsController.create);
router.put('/:id', productsController.update);
router.delete('/:id', productsController.remove);

export default router;
