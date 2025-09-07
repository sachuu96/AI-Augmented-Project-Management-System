import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import productRoutes from "./routes/productRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import { sseHandler } from "./sse";

dotenv.config();

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.use("/products", productRoutes);

  app.get("/events/stream", sseHandler);

  app.use(errorHandler);

  return app;
}

// Only start the server if not in test mode
if (process.env.NODE_ENV !== "test") {
  const { ensureRecentEventsTable } = require("../workers/initDynamo");
  const { startConsumer } = require("./events/consumer");
  const { runAnalyticsWorker } = require("../workers/analytics-worker");

  (async () => {
    await ensureRecentEventsTable();
    const app = createApp();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Express API listening on port ${PORT}`);

      if (process.env.ENABLE_ANALYTICS === "true") {
        runAnalyticsWorker().catch((err: any) => {
          console.error("❌ Analytics worker failed", err);
        });
      }

      startConsumer().catch(console.error);
    });
  })();
}
