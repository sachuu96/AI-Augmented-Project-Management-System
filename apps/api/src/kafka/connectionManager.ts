import { Kafka, Producer, Admin } from 'kafkajs';
import {
  KafkaBrokers,
  PRODUCT_CREATED,
  PRODUCT_DELETED,
  PRODUCT_UPDATED,
  LOW_STOCK_WARNING
} from '../../shared';
import { getBatchConfig } from '../events/batchConfig';

/**
 * Producer-Only Kafka Connection Manager
 * Optimized for high-throughput event publishing
 */
class ProducerKafkaConnectionManager {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private isProducerConnected = false;
  private isAdminConnected = false;
  private connectionPromises: Map<string, Promise<void>> = new Map();
  private config = getBatchConfig();

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'api-service',
      brokers: KafkaBrokers,
    });
  }

  /**
   * Get or create producer instance with connection management
   */
  async getProducer(): Promise<Producer> {
    if (this.producer && this.isProducerConnected) {
      return this.producer;
    }

    // Check if connection is already in progress
    if (this.connectionPromises.has('producer')) {
      await this.connectionPromises.get('producer');
      return this.producer!;
    }

    // Create new producer if needed
    if (!this.producer) {
      this.producer = this.kafka.producer({
        idempotent: true, // Enable idempotent producer for exactly-once delivery
        transactionalId: process.env.KAFKA_TRANSACTIONAL_ID || 'api-service-transaction',
        maxInFlightRequests: 1, // Required for idempotence
        // Add compression if enabled
        ...(this.config.PRODUCER.ENABLE_COMPRESSION && { compression: 'gzip' }),
        // Note: batchSize and lingerMs are not valid producer config properties in KafkaJS
        // These are handled at the send level, not producer creation level
      });
    }

    // Connect producer
    const connectionPromise = this.connectProducer();
    this.connectionPromises.set('producer', connectionPromise);
    
    try {
      await connectionPromise;
      return this.producer;
    } finally {
      this.connectionPromises.delete('producer');
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
   * Initialize Kafka topics with proper partitioning
   */
  async initializeTopics(): Promise<void> {
    const admin = await this.getAdmin();
    const partitionCount = this.config.TOPICS.PARTITIONS;
    const replicationFactor = this.config.TOPICS.REPLICATION_FACTOR;
    
    const topics = [
      { 
        topic: PRODUCT_CREATED, 
        numPartitions: partitionCount,
        replicationFactor 
      },
      { 
        topic: PRODUCT_UPDATED, 
        numPartitions: partitionCount,
        replicationFactor 
      },
      { 
        topic: PRODUCT_DELETED, 
        numPartitions: partitionCount,
        replicationFactor 
      },
      { 
        topic: LOW_STOCK_WARNING, 
        numPartitions: partitionCount,
        replicationFactor 
      },
    ];

    try {
      await admin.createTopics({ topics, waitForLeaders: true });
      console.log(`[ProducerKafkaManager] Created topics with ${partitionCount} partitions`);
    } catch (error: any) {
      // Topics might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        throw error;
      }
      console.log(`[ProducerKafkaManager] Topics already exist`);
    }
  }

  /**
   * Connect producer with retry logic
   */
  private async connectProducer(): Promise<void> {
    if (this.isProducerConnected) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.producer!.connect();
        this.isProducerConnected = true;
        console.log('[ProducerKafkaManager] Producer connected with idempotence enabled');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[ProducerKafkaManager] Failed to connect producer (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect producer after ${maxRetries} attempts: ${error.message}`);
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
        console.log('[ProducerKafkaManager] Admin connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[ProducerKafkaManager] Failed to connect admin (attempt ${retryCount}/${maxRetries}):`, error.message);
        
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
      producer: this.isProducerConnected,
      admin: this.isAdminConnected,
      hasProducer: this.producer !== null,
      hasAdmin: this.admin !== null,
    };
  }

  /**
   * Graceful shutdown of all connections
   */
  async shutdown(): Promise<void> {
    console.log('[ProducerKafkaManager] Starting graceful shutdown...');
    
    const shutdownPromises: Promise<void>[] = [];

    if (this.producer && this.isProducerConnected) {
      shutdownPromises.push(
        this.producer.disconnect().then(() => {
          this.isProducerConnected = false;
          console.log('[ProducerKafkaManager] Producer disconnected');
        }).catch((err: any) => {
          console.error('[ProducerKafkaManager] Error disconnecting producer:', err);
        })
      );
    }

    if (this.admin && this.isAdminConnected) {
      shutdownPromises.push(
        this.admin.disconnect().then(() => {
          this.isAdminConnected = false;
          console.log('[ProducerKafkaManager] Admin disconnected');
        }).catch((err: any) => {
          console.error('[ProducerKafkaManager] Error disconnecting admin:', err);
        })
      );
    }

    await Promise.all(shutdownPromises);
    console.log('[ProducerKafkaManager] Graceful shutdown completed');
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
const producerKafkaManager = new ProducerKafkaConnectionManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[ProducerKafkaManager] Received SIGTERM, shutting down connections...');
  await producerKafkaManager.shutdown();
});

process.on('SIGINT', async () => {
  console.log('[ProducerKafkaManager] Received SIGINT, shutting down connections...');
  await producerKafkaManager.shutdown();
});

export { producerKafkaManager };
export default producerKafkaManager;