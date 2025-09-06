import express from "express";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import cors from "cors";
import { sseHandler } from "./sse";
import { startConsumer } from "./events/consumer";
import { runAnalyticsWorker } from "../workers/analytics-worker";
import { ensureRecentEventsTable } from "../workers/initDynamo";

dotenv.config();

async function bootstrap() {
  await ensureRecentEventsTable(); // make sure table exists

  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use("/products", productRoutes);

  // SSE endpoint
  app.get("/events/stream", sseHandler);

  // Start Kafka consumer in background
  startConsumer().catch(console.error);

  // Global error handler
  app.use(errorHandler);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, async () => {
    console.log(`🚀 Express API listening on port ${PORT}`);

    if (process.env.ENABLE_ANALYTICS === "true") {
      runAnalyticsWorker().catch((err) => {
        console.error("❌ Analytics worker failed", err);
      });
    }
  });
}

bootstrap().catch((err) => {
  console.error("Server failed to start", err);
  process.exit(1);
});

// const app = express();
// app.use(express.json());
// app.use(cors());

// Routes

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
