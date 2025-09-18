import { Kafka, Consumer, Admin } from 'kafkajs';
import { KafkaBrokers, CONSUMER_GROUPS, getBatchConfig } from '@project/shared';

/**
 * Analytics Service Kafka Connection Manager
 * Optimized for analytics consumer workloads
 */
class AnalyticsKafkaConnectionManager {
  private kafka: Kafka;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;
  private isConsumerConnected = false;
  private isAdminConnected = false;
  private connectionPromises: Map<string, Promise<void>> = new Map();
  private config = getBatchConfig();

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'analytics-service',
      brokers: KafkaBrokers,
    });
  }

  /**
   * Get or create analytics consumer instance with connection management
   */
  async getConsumer(): Promise<Consumer> {
    if (this.consumer && this.isConsumerConnected) {
      return this.consumer;
    }

    // Check if connection is already in progress
    if (this.connectionPromises.has('consumer')) {
      await this.connectionPromises.get('consumer');
      return this.consumer!;
    }

    // Create new consumer if needed
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({
        groupId: CONSUMER_GROUPS.ANALYTICS,
        // Analytics-optimized settings for high throughput
        minBytes: this.config.CONSUMER.MIN_BYTES,
        maxBytes: this.config.CONSUMER.MAX_BYTES,
        maxWaitTimeInMs: this.config.CONSUMER.MAX_WAIT_TIME_MS,
        sessionTimeout: this.config.CONSUMER.SESSION_TIMEOUT_MS,
        heartbeatInterval: this.config.CONSUMER.HEARTBEAT_INTERVAL_MS,
        // Allow more time for processing complex analytics operations
        rebalanceTimeout: 60000,
        // Optimize for throughput over latency
        allowAutoTopicCreation: false,
      });
    }

    // Connect consumer
    const connectionPromise = this.connectConsumer();
    this.connectionPromises.set('consumer', connectionPromise);
    
    try {
      await connectionPromise;
      return this.consumer;
    } finally {
      this.connectionPromises.delete('consumer');
    }
  }

  /**
   * Get or create admin instance with connection management
   */
  async getAdmin(): Promise<Admin> {
    if (this.admin && this.isAdminConnected) {
      return this.admin;
    }

    // Check if connection is already in progress
    if (this.connectionPromises.has('admin')) {
      await this.connectionPromises.get('admin');
      return this.admin!;
    }

    // Create new admin if needed
    if (!this.admin) {
      this.admin = this.kafka.admin();
    }

    // Connect admin
    const connectionPromise = this.connectAdmin();
    this.connectionPromises.set('admin', connectionPromise);
    
    try {
      await connectionPromise;
      return this.admin;
    } finally {
      this.connectionPromises.delete('admin');
    }
  }

  /**
   * Connect consumer with retry logic
   */
  private async connectConsumer(): Promise<void> {
    if (this.isConsumerConnected) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.consumer!.connect();
        this.isConsumerConnected = true;
        console.log('[AnalyticsKafkaManager] Consumer connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[AnalyticsKafkaManager] Failed to connect consumer (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect consumer after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  /**
   * Connect admin with retry logic
   */
  private async connectAdmin(): Promise<void> {
    if (this.isAdminConnected) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.admin!.connect();
        this.isAdminConnected = true;
        console.log('[AnalyticsKafkaManager] Admin connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[AnalyticsKafkaManager] Failed to connect admin (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect admin after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  /**
   * Get connection status for health checks
   */
  getConnectionStatus() {
    return {
      consumer: this.isConsumerConnected,
      admin: this.isAdminConnected,
      hasConsumer: this.consumer !== null,
      hasAdmin: this.admin !== null,
    };
  }

  /**
   * Graceful shutdown of all connections
   */
  async shutdown(): Promise<void> {
    console.log('[AnalyticsKafkaManager] Starting graceful shutdown...');
    
    const shutdownPromises: Promise<void>[] = [];

    if (this.consumer && this.isConsumerConnected) {
      shutdownPromises.push(
        this.consumer.disconnect().then(() => {
          this.isConsumerConnected = false;
          console.log('[AnalyticsKafkaManager] Consumer disconnected');
        }).catch(err => {
          console.error('[AnalyticsKafkaManager] Error disconnecting consumer:', err);
        })
      );
    }

    if (this.admin && this.isAdminConnected) {
      shutdownPromises.push(
        this.admin.disconnect().then(() => {
          this.isAdminConnected = false;
          console.log('[AnalyticsKafkaManager] Admin disconnected');
        }).catch(err => {
          console.error('[AnalyticsKafkaManager] Error disconnecting admin:', err);
        })
      );
    }

    await Promise.all(shutdownPromises);
    console.log('[AnalyticsKafkaManager] Graceful shutdown completed');
  }

  /**
   * Health check for readiness probes
   */
  async healthCheck(): Promise<{ status: string; connections: any; error?: string }> {
    try {
      const status = this.getConnectionStatus();
      return {
        status: 'healthy',
        connections: status
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connections: this.getConnectionStatus(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
const analyticsKafkaManager = new AnalyticsKafkaConnectionManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[AnalyticsKafkaManager] Received SIGTERM, shutting down connections...');
  await analyticsKafkaManager.shutdown();
});

process.on('SIGINT', async () => {
  console.log('[AnalyticsKafkaManager] Received SIGINT, shutting down connections...');
  await analyticsKafkaManager.shutdown();
});

export { analyticsKafkaManager };
export default analyticsKafkaManager;