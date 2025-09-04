import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { sellerMiddleware } from '../middleware/sellerMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { createProductSchema } from '../schemas/productSchemas';

const router = Router();

// Apply seller middleware
router.use(sellerMiddleware);

router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);
router.post('/', validate(createProductSchema), ProductController.create);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
