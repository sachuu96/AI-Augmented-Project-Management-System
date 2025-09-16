/**
 * Batch Processing Configuration for KEDA Scaling Optimization
 * 
 * This configuration is designed to create optimal message lag patterns
 * that KEDA can effectively scale against.
 */

export const BATCH_CONFIG = {
  // Producer batch settings
  PRODUCER: {
    // Number of messages to batch before sending
    BATCH_SIZE: parseInt(process.env.KAFKA_BATCH_SIZE || '50'),
    
    // Maximum time to wait before sending a batch (ms)
    BATCH_TIMEOUT_MS: parseInt(process.env.KAFKA_BATCH_TIMEOUT_MS || '500'),
    
    // Safety limit - force flush if batch gets too large
    MAX_BATCH_SIZE: parseInt(process.env.KAFKA_MAX_BATCH_SIZE || '200'),
    
    // Enable compression for better throughput
    ENABLE_COMPRESSION: process.env.KAFKA_ENABLE_COMPRESSION === 'true',
  },

  // Consumer batch settings optimized for KEDA scaling
  CONSUMER: {
    // Minimum bytes to fetch in a single request
    MIN_BYTES: parseInt(process.env.KAFKA_CONSUMER_MIN_BYTES || '1024'),
    
    // Maximum wait time for batching messages (ms)
    MAX_WAIT_TIME_MS: parseInt(process.env.KAFKA_CONSUMER_MAX_WAIT_MS || '100'),
    
    // Maximum bytes to fetch in a single request
    MAX_BYTES: parseInt(process.env.KAFKA_CONSUMER_MAX_BYTES || '1048576'), // 1MB
    
    // Session timeout for consumer group coordination
    SESSION_TIMEOUT_MS: parseInt(process.env.KAFKA_SESSION_TIMEOUT_MS || '30000'),
    
    // Heartbeat interval
    HEARTBEAT_INTERVAL_MS: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL_MS || '3000'),
  },

  // KEDA scaling thresholds
  SCALING: {
    // Lag threshold that triggers scaling up
    LAG_THRESHOLD: parseInt(process.env.KEDA_LAG_THRESHOLD || '10'),
    
    // High priority topics get lower lag threshold
    HIGH_PRIORITY_LAG_THRESHOLD: parseInt(process.env.KEDA_HIGH_PRIORITY_LAG_THRESHOLD || '5'),
    
    // Topics considered high priority
    HIGH_PRIORITY_TOPICS: process.env.KEDA_HIGH_PRIORITY_TOPICS !== undefined ?
      process.env.KEDA_HIGH_PRIORITY_TOPICS.split(',') :
      ['LowStockWarning'],
  },

  // Topic configuration
  TOPICS: {
    // Number of partitions per topic (affects parallelism)
    PARTITIONS: parseInt(process.env.KAFKA_TOPIC_PARTITIONS || '3'),
    
    // Replication factor
    REPLICATION_FACTOR: parseInt(process.env.KAFKA_REPLICATION_FACTOR || '1'),
  },
};

/**
 * Get batch configuration based on environment
 */
export function getBatchConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  // Always use environment variables if they exist, otherwise use environment-specific defaults
  const baseConfig = {
    PRODUCER: {
      BATCH_SIZE: parseInt(process.env.KAFKA_BATCH_SIZE || '0') || getDefaultBatchSize(env),
      BATCH_TIMEOUT_MS: parseInt(process.env.KAFKA_BATCH_TIMEOUT_MS || '0') || getDefaultBatchTimeout(env),
      MAX_BATCH_SIZE: parseInt(process.env.KAFKA_MAX_BATCH_SIZE || '0') || getDefaultMaxBatchSize(env),
      ENABLE_COMPRESSION: process.env.KAFKA_ENABLE_COMPRESSION === 'true',
    },
    CONSUMER: {
      MIN_BYTES: parseInt(process.env.KAFKA_CONSUMER_MIN_BYTES || '0') || getDefaultMinBytes(env),
      MAX_WAIT_TIME_MS: parseInt(process.env.KAFKA_CONSUMER_MAX_WAIT_MS || '0') || getDefaultMaxWaitTime(env),
      MAX_BYTES: parseInt(process.env.KAFKA_CONSUMER_MAX_BYTES || '1048576'),
      SESSION_TIMEOUT_MS: parseInt(process.env.KAFKA_SESSION_TIMEOUT_MS || '30000'),
      HEARTBEAT_INTERVAL_MS: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL_MS || '3000'),
    },
    SCALING: {
      LAG_THRESHOLD: parseInt(process.env.KEDA_LAG_THRESHOLD || '10'),
      HIGH_PRIORITY_LAG_THRESHOLD: parseInt(process.env.KEDA_HIGH_PRIORITY_LAG_THRESHOLD || '5'),
      HIGH_PRIORITY_TOPICS: process.env.KEDA_HIGH_PRIORITY_TOPICS !== undefined ?
        process.env.KEDA_HIGH_PRIORITY_TOPICS.split(',') :
        ['LowStockWarning'],
    },
    TOPICS: {
      PARTITIONS: parseInt(process.env.KAFKA_TOPIC_PARTITIONS || '3'),
      REPLICATION_FACTOR: parseInt(process.env.KAFKA_REPLICATION_FACTOR || '1'),
    },
  };

  return baseConfig;
}

function getDefaultBatchSize(env: string): number {
  switch (env) {
    case 'production': return 100;
    case 'test': return 5;
    default: return 50;
  }
}

function getDefaultBatchTimeout(env: string): number {
  switch (env) {
    case 'production': return 1000;
    case 'test': return 100;
    default: return 500;
  }
}

function getDefaultMaxBatchSize(env: string): number {
  switch (env) {
    case 'production': return 500;
    case 'test': return 10;
    default: return 200;
  }
}

function getDefaultMinBytes(env: string): number {
  switch (env) {
    case 'production': return 2048;
    case 'test': return 1;
    default: return 1024;
  }
}

function getDefaultMaxWaitTime(env: string): number {
  switch (env) {
    case 'production': return 200;
    case 'test': return 50;
    default: return 100;
  }
}

/**
 * Validate batch configuration
 */
export function validateBatchConfig(config = getBatchConfig()) {
  const errors: string[] = [];
  
  if (config.PRODUCER.BATCH_SIZE <= 0) {
    errors.push('PRODUCER.BATCH_SIZE must be greater than 0');
  }
  
  if (config.PRODUCER.BATCH_TIMEOUT_MS <= 0) {
    errors.push('PRODUCER.BATCH_TIMEOUT_MS must be greater than 0');
  }
  
  if (config.PRODUCER.MAX_BATCH_SIZE < config.PRODUCER.BATCH_SIZE) {
    errors.push('PRODUCER.MAX_BATCH_SIZE must be >= PRODUCER.BATCH_SIZE');
  }
  
  if (config.CONSUMER.MIN_BYTES <= 0) {
    errors.push('CONSUMER.MIN_BYTES must be greater than 0');
  }
  
  if (config.CONSUMER.MAX_WAIT_TIME_MS <= 0) {
    errors.push('CONSUMER.MAX_WAIT_TIME_MS must be greater than 0');
  }
  
  if (config.SCALING.LAG_THRESHOLD <= 0) {
    errors.push('SCALING.LAG_THRESHOLD must be greater than 0');
  }
  
  if (errors.length > 0) {
    throw new Error(`Invalid batch configuration: ${errors.join(', ')}`);
  }
  
  return true;
}