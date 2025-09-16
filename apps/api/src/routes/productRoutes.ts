import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { sellerMiddleware } from '../middleware/sellerMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { CreateProductInputSchema } from '../schemas/inputSchemas';

const router = Router();

// Apply seller middleware
router.use(sellerMiddleware);

// Apply rate limiting middleware
router.use(rateLimitMiddleware);

router.get('/', ProductController.getAll);
router.post('/', validate(CreateProductInputSchema), ProductController.create);
router.put('/:id' ,ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
