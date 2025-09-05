import express from 'express';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import cors from 'cors';
import { sseHandler } from "./sse";
import { startConsumer } from "./events/consumer";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors())

// Routes
app.use('/products', productRoutes);

// SSE endpoint
app.get("/events/stream", sseHandler);

// Start Kafka consumer in background
startConsumer().catch(console.error);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
