import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { startNotificationsConsumer, getMetrics, shutdown } from './consumer/notificationsConsumer';
import { handleSSEConnection, getSSEStats, closeAllSSEConnections } from './handlers/sseHandler';
import notificationsKafkaManager from './kafka/connectionManager';

// Load environment variables
dotenv.config();

/**
 * Health check endpoint data
 */
async function getHealthStatus() {
  try {
    const kafkaStatus = await notificationsKafkaManager.healthCheck();

    const isHealthy = kafkaStatus.status === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        kafka: kafkaStatus,
      },
      metrics: getMetrics(),
      sse: getSSEStats(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create Express server for SSE and health endpoints
 */
function createServer() {
  const app = express();
  
  // Enable CORS for all routes
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cache-Control'],
  }));

  // SSE endpoint for real-time notifications
  app.get('/events/stream', handleSSEConnection);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await getHealthStatus();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    const metrics = {
      consumer: getMetrics(),
      sse: getSSEStats(),
      timestamp: new Date().toISOString()
    };
    res.json(metrics);
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'notifications-service',
      version: '1.0.0',
      endpoints: {
        sse: '/events/stream',
        health: '/health',
        metrics: '/metrics'
      },
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

/**
 * Main application startup
 */
async function main() {
  console.log('🚀 [NotificationsService] Starting Notifications Service...');
  
  try {
    // Create Express server
    const app = createServer();
    const port = process.env.PORT || 3001;

    // Start HTTP server
    const server = app.listen(port, () => {
      console.log(`🌐 [NotificationsService] HTTP server listening on port ${port}`);
    });

    // Start the notifications consumer
    await startNotificationsConsumer();

    console.log('✅ [NotificationsService] Notifications Service started successfully');

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`🛑 [NotificationsService] Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Close all SSE connections
        closeAllSSEConnections();
        
        // Close HTTP server
        server.close(() => {
          console.log('🌐 [NotificationsService] HTTP server closed');
        });
        
        // Shutdown notifications consumer
        await shutdown();
        
        console.log('✅ [NotificationsService] Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ [NotificationsService] Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ [NotificationsService] Failed to start:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ [NotificationsService] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [NotificationsService] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('❌ [NotificationsService] Failed to start application:', error);
  process.exit(1);
});