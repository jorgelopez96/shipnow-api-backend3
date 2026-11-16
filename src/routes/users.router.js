import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.delete('/:id', usersController.remove);
router.post('/:id/documents', uploadSingle('document'), usersController.addDocument);

export default router;
