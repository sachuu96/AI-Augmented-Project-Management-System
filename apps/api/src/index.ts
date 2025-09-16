import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import productRoutes from "./routes/productRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import { sseHandler } from "./sse";
import kafkaConnectionManager from "./kafka/connectionManager";

dotenv.config();

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.use("/products", productRoutes);

  app.get("/events/stream", sseHandler);

  // Health check endpoints
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });

  app.get("/ready", async (req, res) => {
    try {
      // Check if batch publisher is available and connected
      const { batchPublisher } = require("./events/publisher");
      const batchStatus = batchPublisher.getBatchStatus();
      
      // Check Kafka connection status
      const kafkaHealth = await kafkaConnectionManager.healthCheck();
      const kafkaStatus = kafkaConnectionManager.getConnectionStatus();
      
      // Check if essential services are ready
      const readinessChecks = {
        batchPublisher: {
          status: "ready",
          pendingEvents: batchStatus.pendingEvents,
          batchSize: batchStatus.batchSize
        },
        database: {
          status: "ready", // Could add actual DB health check here
        },
        kafka: {
          status: kafkaHealth.status,
          connections: kafkaStatus,
          error: kafkaHealth.error
        }
      };

      const isReady = kafkaHealth.status === 'healthy';
      
      res.status(isReady ? 200 : 503).json({
        status: isReady ? "ready" : "not ready",
        timestamp: new Date().toISOString(),
        checks: readinessChecks
      });
    } catch (error) {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced metrics endpoint with batch processing metrics
  app.get("/metrics", (req, res) => {
    try {
      const { batchPublisher } = require("./events/publisher");
      const kafkaStatus = kafkaConnectionManager.getConnectionStatus();
      
      const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        // Batch processing metrics for KEDA scaling
        batch: batchPublisher.getMetrics(),
        // Kafka connection metrics
        kafka: kafkaStatus,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid
        }
      };
      res.status(200).json(metrics);
    } catch (error) {
      // Fallback if batch publisher is not available
      const kafkaStatus = kafkaConnectionManager.getConnectionStatus();
      const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        kafka: kafkaStatus,
        error: "Batch publisher not available"
      };
      res.status(200).json(metrics);
    }
  });

  // Prometheus-style metrics endpoint for KEDA
  app.get("/metrics/prometheus", (req, res) => {
    try {
      const { batchPublisher } = require("./events/publisher");
      const batchMetrics = batchPublisher.getMetrics();
      const memUsage = process.memoryUsage();
      
      const prometheusMetrics = `
# HELP pending_batch_messages Number of messages pending in batch queue
# TYPE pending_batch_messages gauge
pending_batch_messages{job="api"} ${batchMetrics.pending_batch_messages}

# HELP batch_processing_connected Whether batch publisher is connected
# TYPE batch_processing_connected gauge
batch_processing_connected{job="api"} ${batchMetrics.is_connected || 0}

# HELP batch_size_configured Configured batch size
# TYPE batch_size_configured gauge
batch_size_configured{job="api"} ${batchMetrics.batch_size_configured}

# HELP batch_timeout_ms Configured batch timeout in milliseconds
# TYPE batch_timeout_ms gauge
batch_timeout_ms{job="api"} ${batchMetrics.batch_timeout_ms}

# HELP batch_has_scheduled_flush Whether batch has scheduled flush
# TYPE batch_has_scheduled_flush gauge
batch_has_scheduled_flush{job="api"} ${batchMetrics.has_scheduled_flush}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds{job="api"} ${process.uptime()}

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss",job="api"} ${memUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal",job="api"} ${memUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed",job="api"} ${memUsage.heapUsed}
nodejs_memory_usage_bytes{type="external",job="api"} ${memUsage.external}

# HELP nodejs_version_info Node.js version information
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}",job="api"} 1
`.trim();

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } catch (error) {
      // Fallback prometheus metrics
      const memUsage = process.memoryUsage();
      const prometheusMetrics = `
# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds{job="api"} ${process.uptime()}

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss",job="api"} ${memUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal",job="api"} ${memUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed",job="api"} ${memUsage.heapUsed}

# HELP batch_publisher_error Batch publisher error status
# TYPE batch_publisher_error gauge
batch_publisher_error{job="api"} 1
`.trim();

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    }
  });

  // Liveness probe endpoint (simple check)
  app.get("/live", (req, res) => {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString()
    });
  });

  // Startup probe endpoint (checks if app is fully initialized)
  app.get("/startup", (req, res) => {
    // Check if all initialization is complete
    const isStarted = process.uptime() > 10; // Simple check - app has been running for 10+ seconds
    
    if (isStarted) {
      res.status(200).json({
        status: "started",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } else {
      res.status(503).json({
        status: "starting",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  });

  app.use(errorHandler);

  return app;
}

// Only start the server if not in test mode
if (process.env.NODE_ENV !== "test") {
  const { ensureRecentEventsTable } = require("../workers/initDynamo");
  const { startConsumer } = require("./events/consumer");
  const { runAnalyticsWorker } = require("../workers/analytics-worker");

  (async () => {
    try {
      const app = createApp();
      const PORT = process.env.PORT || 3000;
      
      // Start the server first, then initialize external services
      app.listen(PORT, async () => {
        console.log(`🚀 Express API listening on port ${PORT}`);

        // Initialize DynamoDB tables (non-blocking)
        try {
          console.log('🗄️ Initializing DynamoDB tables...');
          await ensureRecentEventsTable();
          console.log('✅ DynamoDB tables initialized');
        } catch (error) {
          console.error('⚠️ DynamoDB initialization failed, but server will continue running:', error);
          console.log('📝 Analytics features may not work until DynamoDB is available');
        }

        // Initialize Kafka connections and topics (non-blocking)
        try {
          console.log('🔌 Initializing Kafka connections...');
          await kafkaConnectionManager.initializeTopics();
          
          // Pre-connect producer for faster first message
          await kafkaConnectionManager.getProducer();
          console.log('✅ Kafka producer connected');
          
          // Start Kafka consumer
          await startConsumer();
          console.log('✅ Kafka consumer started');
          
        } catch (error) {
          console.error('⚠️ Kafka initialization failed, but server will continue running:', error);
          console.log('📝 Application will work without real-time events until Kafka is available');
        }

        // Start analytics worker if enabled
        if (process.env.ENABLE_ANALYTICS === "true") {
          runAnalyticsWorker().catch((err: any) => {
            console.error("❌ Analytics worker failed", err);
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  })();
}
