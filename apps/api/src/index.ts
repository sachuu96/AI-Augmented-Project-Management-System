import express from 'express';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/products', productRoutes);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
