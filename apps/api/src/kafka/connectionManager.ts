import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { KafkaBrokers, PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../../shared';
import { getBatchConfig, validateBatchConfig } from '../events/batchConfig';

/**
 * Centralized Kafka Connection Manager
 * Manages all Kafka connections at application level for better resource management
 */
class KafkaConnectionManager {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private analyticsConsumer: Consumer | null = null;
  private admin: Admin | null = null;
  private isProducerConnected = false;
  private isConsumerConnected = false;
  private isAnalyticsConsumerConnected = false;
  private isAdminConnected = false;
  private connectionPromises: Map<string, Promise<void>> = new Map();
  private config = getBatchConfig();

  constructor() {
    try {
      // Validate batch configuration before initializing Kafka
      validateBatchConfig();
      console.log('[KafkaConnectionManager] Batch configuration validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('[KafkaConnectionManager] Batch configuration validation failed:', errorMessage);
      throw new Error(`Kafka Connection Manager initialization failed: ${errorMessage}`);
    }

    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'product-service',
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
        transactionalId: process.env.KAFKA_TRANSACTIONAL_ID || 'product-service-transaction',
        maxInFlightRequests: 1, // Required for idempotence
        // Add compression if enabled
        ...(this.config.PRODUCER.ENABLE_COMPRESSION && { compression: 'gzip' }),
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
   * Get or create consumer instance with connection management
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
        groupId: this.config.REAL_TIME_CONSUMER.GROUP_ID,
        // Real-time consumer settings: fetch messages as soon as they arrive
        minBytes: this.config.REAL_TIME_CONSUMER.MIN_BYTES,
        maxBytes: this.config.REAL_TIME_CONSUMER.MAX_BYTES,
        maxWaitTimeInMs: this.config.REAL_TIME_CONSUMER.MAX_WAIT_TIME_MS,
        sessionTimeout: this.config.REAL_TIME_CONSUMER.SESSION_TIMEOUT_MS,
        heartbeatInterval: this.config.REAL_TIME_CONSUMER.HEARTBEAT_INTERVAL_MS,
        // Offset commit configuration for exactly-once semantics
        readUncommitted: false, // Ensure we only read committed messages
        ...(this.config.REAL_TIME_CONSUMER.ENABLE_AUTO_COMMIT === false && {
          autoCommit: false,
          autoCommitInterval: this.config.REAL_TIME_CONSUMER.AUTO_COMMIT_INTERVAL_MS,
          autoCommitThreshold: this.config.REAL_TIME_CONSUMER.AUTO_COMMIT_THRESHOLD,
        }),
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
   * Get or create analytics consumer instance with connection management
   */
  async getAnalyticsConsumer(): Promise<Consumer> {
    const analyticsConnectionKey = 'analyticsConnection';
    
    // Check if we already have a connected analytics consumer
    if (this.analyticsConsumer && this.isAnalyticsConsumerConnected) {
      return this.analyticsConsumer;
    }

    // Check if connection is already in progress
    if (this.connectionPromises.has(analyticsConnectionKey)) {
      await this.connectionPromises.get(analyticsConnectionKey);
      return this.analyticsConsumer!;
    }

    // Create new analytics consumer if needed
    if (!this.analyticsConsumer) {
      this.analyticsConsumer = this.kafka.consumer({
        groupId: this.config.ANALYTICS_CONSUMER.GROUP_ID,
        minBytes: this.config.ANALYTICS_CONSUMER.MIN_BYTES,
        maxWaitTimeInMs: this.config.ANALYTICS_CONSUMER.MAX_WAIT_TIME_MS,
        maxBytes: this.config.ANALYTICS_CONSUMER.MAX_BYTES,
        sessionTimeout: this.config.ANALYTICS_CONSUMER.SESSION_TIMEOUT_MS,
        heartbeatInterval: this.config.ANALYTICS_CONSUMER.HEARTBEAT_INTERVAL_MS,
        // Offset commit configuration for exactly-once semantics
        readUncommitted: false, // Ensure we only read committed messages
        ...(this.config.ANALYTICS_CONSUMER.ENABLE_AUTO_COMMIT === false && {
          autoCommit: false,
          autoCommitInterval: this.config.ANALYTICS_CONSUMER.AUTO_COMMIT_INTERVAL_MS,
          autoCommitThreshold: this.config.ANALYTICS_CONSUMER.AUTO_COMMIT_THRESHOLD,
        }),
      });
    }

    // Connect analytics consumer
    const connectionPromise = this.connectAnalyticsConsumer();
    this.connectionPromises.set(analyticsConnectionKey, connectionPromise);
    
    try {
      await connectionPromise;
      return this.analyticsConsumer;
    } finally {
      this.connectionPromises.delete(analyticsConnectionKey);
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
      console.log(`[KafkaConnectionManager] Created topics with ${partitionCount} partitions`);
    } catch (error: any) {
      // Topics might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        throw error;
      }
      console.log(`[KafkaConnectionManager] Topics already exist`);
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
        console.log('[KafkaConnectionManager] Producer connected with idempotence enabled');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[KafkaConnectionManager] Failed to connect producer (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect producer after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
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
        console.log('[KafkaConnectionManager] Consumer connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[KafkaConnectionManager] Failed to connect consumer (attempt ${retryCount}/${maxRetries}):`, error.message);
        
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
        console.log('[KafkaConnectionManager] Admin connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[KafkaConnectionManager] Failed to connect admin (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect admin after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  /**
   * Connect analytics consumer with retry logic
   */
  private async connectAnalyticsConsumer(): Promise<void> {
    if (this.isAnalyticsConsumerConnected) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.analyticsConsumer!.connect();
        this.isAnalyticsConsumerConnected = true;
        console.log('[KafkaConnectionManager] Analytics consumer connected');
        return;
      } catch (error: any) {
        retryCount++;
        console.error(`[KafkaConnectionManager] Failed to connect analytics consumer (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect analytics consumer after ${maxRetries} attempts: ${error.message}`);
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
      consumer: this.isConsumerConnected,
      analyticsConsumer: this.isAnalyticsConsumerConnected,
      admin: this.isAdminConnected,
      hasProducer: this.producer !== null,
      hasConsumer: this.consumer !== null,
      hasAnalyticsConsumer: this.analyticsConsumer !== null,
      hasAdmin: this.admin !== null,
    };
  }

  /**
   * Graceful shutdown of all connections
   */
  async shutdown(): Promise<void> {
    console.log('[KafkaConnectionManager] Starting graceful shutdown...');
    
    const shutdownPromises: Promise<void>[] = [];

    if (this.producer && this.isProducerConnected) {
      shutdownPromises.push(
        this.producer.disconnect().then(() => {
          this.isProducerConnected = false;
          console.log('[KafkaConnectionManager] Producer disconnected');
        }).catch(err => {
          console.error('[KafkaConnectionManager] Error disconnecting producer:', err);
        })
      );
    }

    if (this.consumer && this.isConsumerConnected) {
      shutdownPromises.push(
        this.consumer.disconnect().then(() => {
          this.isConsumerConnected = false;
          console.log('[KafkaConnectionManager] Consumer disconnected');
        }).catch(err => {
          console.error('[KafkaConnectionManager] Error disconnecting consumer:', err);
        })
      );
    }

    if (this.analyticsConsumer && this.isAnalyticsConsumerConnected) {
      shutdownPromises.push(
        this.analyticsConsumer.disconnect().then(() => {
          this.isAnalyticsConsumerConnected = false;
          console.log('[KafkaConnectionManager] Analytics consumer disconnected');
        }).catch(err => {
          console.error('[KafkaConnectionManager] Error disconnecting analytics consumer:', err);
        })
      );
    }

    if (this.admin && this.isAdminConnected) {
      shutdownPromises.push(
        this.admin.disconnect().then(() => {
          this.isAdminConnected = false;
          console.log('[KafkaConnectionManager] Admin disconnected');
        }).catch(err => {
          console.error('[KafkaConnectionManager] Error disconnecting admin:', err);
        })
      );
    }

    await Promise.all(shutdownPromises);
    console.log('[KafkaConnectionManager] Graceful shutdown completed');
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
const kafkaConnectionManager = new KafkaConnectionManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[KafkaConnectionManager] Received SIGTERM, shutting down connections...');
  await kafkaConnectionManager.shutdown();
});

process.on('SIGINT', async () => {
  console.log('[KafkaConnectionManager] Received SIGINT, shutting down connections...');
  await kafkaConnectionManager.shutdown();
});

export { kafkaConnectionManager };
export default kafkaConnectionManager;