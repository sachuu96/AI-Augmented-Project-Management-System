import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { sellerMiddleware } from '../middleware/sellerMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { CreateProductInputSchema } from '../schemas/inputSchemas';

const router = Router();

// Apply seller middleware
router.use(sellerMiddleware);

router.get('/', ProductController.getAll);
router.post('/', validate(CreateProductInputSchema), ProductController.create);
router.put('/:id' ,ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
