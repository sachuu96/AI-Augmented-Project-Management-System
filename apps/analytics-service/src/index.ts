import dotenv from 'dotenv';
import { startAnalyticsConsumer, getMetrics, shutdown } from './consumer/analyticsConsumer';
import { healthCheck as dynamoHealthCheck } from './storage/dynamoClient';
import { healthCheck as s3HealthCheck } from './storage/s3Client';
import analyticsKafkaManager from './kafka/connectionManager';

// Load environment variables
dotenv.config();

/**
 * Health check endpoint data
 */
async function getHealthStatus() {
  try {
    const [kafkaStatus, dynamoStatus, s3Status] = await Promise.all([
      analyticsKafkaManager.healthCheck(),
      dynamoHealthCheck(),
      s3HealthCheck(),
    ]);

    const isHealthy = 
      kafkaStatus.status === 'healthy' &&
      dynamoStatus.status === 'healthy' &&
      s3Status.status === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        kafka: kafkaStatus,
        dynamodb: dynamoStatus,
        s3: s3Status,
      },
      metrics: await getMetrics(),
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
 * Simple HTTP server for health checks and metrics
 */
function startHealthServer() {
  const http = require('http');
  const port = process.env.HEALTH_PORT || 8080;

  const server = http.createServer(async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/health') {
      const health = await getHealthStatus();
      res.statusCode = health.status === 'healthy' ? 200 : 503;
      res.end(JSON.stringify(health, null, 2));
    } else if (req.url === '/metrics') {
      try {
        const metrics = await getMetrics();
        res.statusCode = 200;
        res.end(JSON.stringify(metrics, null, 2));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to get metrics' }));
      }
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`🏥 [AnalyticsService] Health server listening on port ${port}`);
  });

  return server;
}

/**
 * Main application startup
 */
async function main() {
  console.log('🚀 [AnalyticsService] Starting Analytics Service...');
  
  try {
    // Start health server
    const healthServer = startHealthServer();

    // Start the analytics consumer
    await startAnalyticsConsumer();

    console.log('✅ [AnalyticsService] Analytics Service started successfully');

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`🛑 [AnalyticsService] Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Close health server
        healthServer.close();
        
        // Shutdown analytics consumer
        await shutdown();
        
        console.log('✅ [AnalyticsService] Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ [AnalyticsService] Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ [AnalyticsService] Failed to start:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ [AnalyticsService] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [AnalyticsService] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('❌ [AnalyticsService] Failed to start application:', error);
  process.exit(1);
});