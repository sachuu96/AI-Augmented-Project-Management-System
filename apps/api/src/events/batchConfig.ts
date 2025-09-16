/**
 * Kafka Configuration with Consumer-Specific Settings
 * Supports real-time and analytics processing with Redis deduplication
 */

// Legacy constant - use getBatchConfig() instead
export const BATCH_CONFIG = getBatchConfig();

/**
 * Get batch configuration based on environment with consumer-specific profiles
 */
export function getBatchConfig() {
  const env = process.env.NODE_ENV || "development";

  // Get environment-specific profiles
  const envProfile = getEnvironmentProfile(env);

  // Always use environment variables if they exist, otherwise use environment-specific defaults
  const baseConfig = {
    PRODUCER: {
      BATCH_SIZE: parseInt(process.env.KAFKA_BATCH_SIZE || "50"),
      BATCH_TIMEOUT_MS: parseInt(process.env.KAFKA_BATCH_TIMEOUT_MS || "500"),
      MAX_BATCH_SIZE: parseInt(process.env.KAFKA_MAX_BATCH_SIZE || "200"),
      ENABLE_COMPRESSION: process.env.KAFKA_ENABLE_COMPRESSION === "true",
    },
    REAL_TIME_CONSUMER: {
      MIN_BYTES:
        parseInt(process.env.KAFKA_RT_MIN_BYTES || "0") ||
        envProfile.REAL_TIME_CONSUMER.MIN_BYTES,
      MAX_WAIT_TIME_MS:
        parseInt(process.env.KAFKA_RT_MAX_WAIT_MS || "0") ||
        envProfile.REAL_TIME_CONSUMER.MAX_WAIT_TIME_MS,
      MAX_BYTES:
        parseInt(process.env.KAFKA_RT_MAX_BYTES || "0") ||
        envProfile.REAL_TIME_CONSUMER.MAX_BYTES,
      SESSION_TIMEOUT_MS:
        parseInt(process.env.KAFKA_RT_SESSION_TIMEOUT_MS || "0") ||
        envProfile.REAL_TIME_CONSUMER.SESSION_TIMEOUT_MS,
      HEARTBEAT_INTERVAL_MS:
        parseInt(process.env.KAFKA_RT_HEARTBEAT_INTERVAL_MS || "0") ||
        envProfile.REAL_TIME_CONSUMER.HEARTBEAT_INTERVAL_MS,
      GROUP_ID: process.env.KAFKA_RT_GROUP_ID || envProfile.REAL_TIME_CONSUMER.GROUP_ID,
      PROCESSING_TIMEOUT_MS:
        parseInt(process.env.KAFKA_RT_PROCESSING_TIMEOUT_MS || "0") ||
        envProfile.REAL_TIME_CONSUMER.PROCESSING_TIMEOUT_MS,
      // Offset commit configuration for exactly-once semantics
      ENABLE_AUTO_COMMIT: process.env.KAFKA_RT_AUTO_COMMIT !== "false",
      AUTO_COMMIT_INTERVAL_MS: parseInt(process.env.KAFKA_RT_AUTO_COMMIT_INTERVAL_MS || "5000"),
      AUTO_COMMIT_THRESHOLD: parseInt(process.env.KAFKA_RT_AUTO_COMMIT_THRESHOLD || "100"),
    },
    ANALYTICS_CONSUMER: {
      MIN_BYTES:
        parseInt(process.env.KAFKA_ANALYTICS_MIN_BYTES || "0") ||
        envProfile.ANALYTICS_CONSUMER.MIN_BYTES,
      MAX_WAIT_TIME_MS:
        parseInt(process.env.KAFKA_ANALYTICS_MAX_WAIT_MS || "0") ||
        envProfile.ANALYTICS_CONSUMER.MAX_WAIT_TIME_MS,
      MAX_BYTES:
        parseInt(process.env.KAFKA_ANALYTICS_MAX_BYTES || "0") ||
        envProfile.ANALYTICS_CONSUMER.MAX_BYTES,
      SESSION_TIMEOUT_MS:
        parseInt(process.env.KAFKA_ANALYTICS_SESSION_TIMEOUT_MS || "0") ||
        envProfile.ANALYTICS_CONSUMER.SESSION_TIMEOUT_MS,
      HEARTBEAT_INTERVAL_MS:
        parseInt(process.env.KAFKA_ANALYTICS_HEARTBEAT_INTERVAL_MS || "0") ||
        envProfile.ANALYTICS_CONSUMER.HEARTBEAT_INTERVAL_MS,
      GROUP_ID: process.env.KAFKA_ANALYTICS_GROUP_ID || envProfile.ANALYTICS_CONSUMER.GROUP_ID,
      BATCH_PROCESSING_TIMEOUT_MS:
        parseInt(process.env.KAFKA_ANALYTICS_BATCH_TIMEOUT_MS || "0") ||
        envProfile.ANALYTICS_CONSUMER.BATCH_PROCESSING_TIMEOUT_MS,
      MAX_BATCH_SIZE:
        parseInt(process.env.KAFKA_ANALYTICS_MAX_BATCH_SIZE || "0") ||
        envProfile.ANALYTICS_CONSUMER.MAX_BATCH_SIZE,
      // Offset commit configuration for exactly-once semantics
      ENABLE_AUTO_COMMIT: process.env.KAFKA_ANALYTICS_AUTO_COMMIT !== "false",
      AUTO_COMMIT_INTERVAL_MS: parseInt(process.env.KAFKA_ANALYTICS_AUTO_COMMIT_INTERVAL_MS || "10000"),
      AUTO_COMMIT_THRESHOLD: parseInt(process.env.KAFKA_ANALYTICS_AUTO_COMMIT_THRESHOLD || "50"),
    },
    MONITORING: {
      ENABLE_METRICS: process.env.KAFKA_ENABLE_METRICS === "true",
      METRICS_INTERVAL_MS:
        parseInt(process.env.KAFKA_METRICS_INTERVAL_MS || "0") ||
        envProfile.MONITORING.METRICS_INTERVAL_MS,
      ALERT_THRESHOLDS: {
        CONSUMER_LAG_CRITICAL:
          parseInt(process.env.KAFKA_LAG_CRITICAL_THRESHOLD || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.CONSUMER_LAG_CRITICAL,
        CONSUMER_LAG_WARNING:
          parseInt(process.env.KAFKA_LAG_WARNING_THRESHOLD || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.CONSUMER_LAG_WARNING,
        PROCESSING_TIME_CRITICAL_MS:
          parseInt(process.env.KAFKA_PROCESSING_CRITICAL_MS || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.PROCESSING_TIME_CRITICAL_MS,
        PROCESSING_TIME_WARNING_MS:
          parseInt(process.env.KAFKA_PROCESSING_WARNING_MS || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.PROCESSING_TIME_WARNING_MS,
        ERROR_RATE_CRITICAL:
          parseFloat(process.env.KAFKA_ERROR_RATE_CRITICAL || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.ERROR_RATE_CRITICAL,
        ERROR_RATE_WARNING:
          parseFloat(process.env.KAFKA_ERROR_RATE_WARNING || "0") ||
          envProfile.MONITORING.ALERT_THRESHOLDS.ERROR_RATE_WARNING,
      },
      HEALTH_CHECK: {
        ENABLED: process.env.KAFKA_HEALTH_CHECK_ENABLED !== "false",
        INTERVAL_MS:
          parseInt(process.env.KAFKA_HEALTH_CHECK_INTERVAL_MS || "0") ||
          envProfile.MONITORING.HEALTH_CHECK.INTERVAL_MS,
        TIMEOUT_MS:
          parseInt(process.env.KAFKA_HEALTH_CHECK_TIMEOUT_MS || "0") ||
          envProfile.MONITORING.HEALTH_CHECK.TIMEOUT_MS,
      },
    },
    KEDA: {
      GLOBAL: {
        MIN_REPLICAS:
          parseInt(process.env.KEDA_MIN_REPLICAS || "0") ||
          envProfile.KEDA.GLOBAL.MIN_REPLICAS,
        MAX_REPLICAS:
          parseInt(process.env.KEDA_MAX_REPLICAS || "0") ||
          envProfile.KEDA.GLOBAL.MAX_REPLICAS,
        COOLDOWN_PERIOD_SECONDS:
          parseInt(process.env.KEDA_COOLDOWN_PERIOD || "0") ||
          envProfile.KEDA.GLOBAL.COOLDOWN_PERIOD_SECONDS,
      },
      REAL_TIME: {
        LAG_THRESHOLD:
          parseInt(process.env.KEDA_RT_LAG_THRESHOLD || "0") ||
          envProfile.KEDA.REAL_TIME.LAG_THRESHOLD,
        SCALE_UP_FACTOR:
          parseFloat(process.env.KEDA_RT_SCALE_UP_FACTOR || "0") ||
          envProfile.KEDA.REAL_TIME.SCALE_UP_FACTOR,
        SCALE_DOWN_FACTOR:
          parseFloat(process.env.KEDA_RT_SCALE_DOWN_FACTOR || "0") ||
          envProfile.KEDA.REAL_TIME.SCALE_DOWN_FACTOR,
        STABILIZATION_WINDOW_SECONDS:
          parseInt(process.env.KEDA_RT_STABILIZATION_WINDOW || "0") ||
          envProfile.KEDA.REAL_TIME.STABILIZATION_WINDOW_SECONDS,
      },
      ANALYTICS: {
        LAG_THRESHOLD:
          parseInt(process.env.KEDA_ANALYTICS_LAG_THRESHOLD || "0") ||
          envProfile.KEDA.ANALYTICS.LAG_THRESHOLD,
        SCALE_UP_FACTOR:
          parseFloat(process.env.KEDA_ANALYTICS_SCALE_UP_FACTOR || "0") ||
          envProfile.KEDA.ANALYTICS.SCALE_UP_FACTOR,
        SCALE_DOWN_FACTOR:
          parseFloat(process.env.KEDA_ANALYTICS_SCALE_DOWN_FACTOR || "0") ||
          envProfile.KEDA.ANALYTICS.SCALE_DOWN_FACTOR,
        STABILIZATION_WINDOW_SECONDS:
          parseInt(process.env.KEDA_ANALYTICS_STABILIZATION_WINDOW || "0") ||
          envProfile.KEDA.ANALYTICS.STABILIZATION_WINDOW_SECONDS,
        THROUGHPUT_THRESHOLD:
          parseInt(process.env.KEDA_ANALYTICS_THROUGHPUT_THRESHOLD || "0") ||
          envProfile.KEDA.ANALYTICS.THROUGHPUT_THRESHOLD,
        MEMORY_USAGE_THRESHOLD_PERCENT:
          parseInt(process.env.KEDA_ANALYTICS_MEMORY_THRESHOLD || "0") ||
          envProfile.KEDA.ANALYTICS.MEMORY_USAGE_THRESHOLD_PERCENT,
      },
    },
    TOPICS: {
      PARTITIONS: parseInt(process.env.KAFKA_TOPIC_PARTITIONS || "3"),
      REPLICATION_FACTOR: parseInt(process.env.KAFKA_REPLICATION_FACTOR || "1"),
    },
    REDIS: {
      URL: process.env.REDIS_URL || envProfile.REDIS.URL,
      ENABLED: process.env.REDIS_ENABLED !== "false",
      MAX_CONNECTIONS: parseInt(process.env.REDIS_MAX_CONNECTIONS || "0") || envProfile.REDIS.MAX_CONNECTIONS,
      MIN_CONNECTIONS: parseInt(process.env.REDIS_MIN_CONNECTIONS || "0") || envProfile.REDIS.MIN_CONNECTIONS,
      CONNECT_TIMEOUT_MS: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || "0") || envProfile.REDIS.CONNECT_TIMEOUT_MS,
      COMMAND_TIMEOUT_MS: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || "0") || envProfile.REDIS.COMMAND_TIMEOUT_MS,
      DEDUP_TTL_SECONDS: parseInt(process.env.REDIS_DEDUP_TTL || "0") || envProfile.REDIS.DEDUP_TTL_SECONDS,
      ANALYTICS_DEDUP_TTL_SECONDS: parseInt(process.env.REDIS_ANALYTICS_DEDUP_TTL || "0") || envProfile.REDIS.ANALYTICS_DEDUP_TTL_SECONDS,
      CONSUMER_KEY_PREFIX: process.env.REDIS_CONSUMER_KEY_PREFIX || envProfile.REDIS.CONSUMER_KEY_PREFIX,
      ANALYTICS_KEY_PREFIX: process.env.REDIS_ANALYTICS_KEY_PREFIX || envProfile.REDIS.ANALYTICS_KEY_PREFIX,
      HEALTH_CHECK_ENABLED: process.env.REDIS_HEALTH_CHECK_ENABLED !== "false",
      HEALTH_CHECK_INTERVAL_MS: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL_MS || "0") || envProfile.REDIS.HEALTH_CHECK_INTERVAL_MS,
      RETRY_ATTEMPTS: parseInt(process.env.REDIS_RETRY_ATTEMPTS || "0") || envProfile.REDIS.RETRY_ATTEMPTS,
      RETRY_DELAY_MS: parseInt(process.env.REDIS_RETRY_DELAY_MS || "0") || envProfile.REDIS.RETRY_DELAY_MS,
      RATE_LIMIT: {
        ENABLED: process.env.RATE_LIMIT_ENABLED !== "false",
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "0") || envProfile.REDIS.RATE_LIMIT.MAX_REQUESTS,
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "0") || envProfile.REDIS.RATE_LIMIT.WINDOW_MS,
        BLOCK_DURATION: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || "0") || envProfile.REDIS.RATE_LIMIT.BLOCK_DURATION,
        KEY_PREFIX: process.env.RATE_LIMIT_KEY_PREFIX || envProfile.REDIS.RATE_LIMIT.KEY_PREFIX,
      },
    },
  };

  return baseConfig;
}


/**
 * Get environment-specific performance profiles
 */
function getEnvironmentProfile(env: string) {
  switch (env) {
    case "production":
      return {
        REAL_TIME_CONSUMER: {
          MIN_BYTES: 1,
          MAX_WAIT_TIME_MS: 0,
          MAX_BYTES: 1048576, // 1MB
          SESSION_TIMEOUT_MS: 30000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "notifications-service-prod",
          PROCESSING_TIMEOUT_MS: 5000,
          ENABLE_AUTO_COMMIT: false, // Manual commits for exactly-once
          AUTO_COMMIT_INTERVAL_MS: 5000,
          AUTO_COMMIT_THRESHOLD: 100,
        },
        ANALYTICS_CONSUMER: {
          MIN_BYTES: 2048,
          MAX_WAIT_TIME_MS: 200,
          MAX_BYTES: 4194304, // 4MB
          SESSION_TIMEOUT_MS: 60000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "analytics-service-prod",
          BATCH_PROCESSING_TIMEOUT_MS: 45000,
          MAX_BATCH_SIZE: 200,
          ENABLE_AUTO_COMMIT: false, // Manual commits for exactly-once
          AUTO_COMMIT_INTERVAL_MS: 10000,
          AUTO_COMMIT_THRESHOLD: 50,
        },
        MONITORING: {
          METRICS_INTERVAL_MS: 30000,
          ALERT_THRESHOLDS: {
            CONSUMER_LAG_CRITICAL: 200,
            CONSUMER_LAG_WARNING: 100,
            PROCESSING_TIME_CRITICAL_MS: 15000,
            PROCESSING_TIME_WARNING_MS: 8000,
            ERROR_RATE_CRITICAL: 0.15,
            ERROR_RATE_WARNING: 0.08,
          },
          HEALTH_CHECK: {
            INTERVAL_MS: 60000,
            TIMEOUT_MS: 5000,
          },
        },
        KEDA: {
          GLOBAL: {
            MIN_REPLICAS: 2,
            MAX_REPLICAS: 20,
            COOLDOWN_PERIOD_SECONDS: 300,
          },
          REAL_TIME: {
            LAG_THRESHOLD: 10,
            SCALE_UP_FACTOR: 2.0,
            SCALE_DOWN_FACTOR: 0.7,
            STABILIZATION_WINDOW_SECONDS: 60,
          },
          ANALYTICS: {
            LAG_THRESHOLD: 50,
            SCALE_UP_FACTOR: 2.5,
            SCALE_DOWN_FACTOR: 0.6,
            STABILIZATION_WINDOW_SECONDS: 180,
            THROUGHPUT_THRESHOLD: 2000,
            MEMORY_USAGE_THRESHOLD_PERCENT: 85,
          },
        },
        REDIS: {
          URL: "redis://localhost:6379",
          MAX_CONNECTIONS: 20,
          MIN_CONNECTIONS: 2,
          CONNECT_TIMEOUT_MS: 5000,
          COMMAND_TIMEOUT_MS: 3000,
          DEDUP_TTL_SECONDS: 3600,
          ANALYTICS_DEDUP_TTL_SECONDS: 7200,
          CONSUMER_KEY_PREFIX: "kafka:dedup:consumer:",
          ANALYTICS_KEY_PREFIX: "kafka:dedup:analytics:",
          HEALTH_CHECK_INTERVAL_MS: 30000,
          RETRY_ATTEMPTS: 3,
          RETRY_DELAY_MS: 1000,
          RATE_LIMIT: {
            ENABLED: true,
            MAX_REQUESTS: 1000,
            WINDOW_MS: 900000, // 15 minutes
            BLOCK_DURATION: 60,
            KEY_PREFIX: "rate_limit:",
          },
        },
      };

    case "staging":
      return {
        REAL_TIME_CONSUMER: {
          MIN_BYTES: 1,
          MAX_WAIT_TIME_MS: 0,
          MAX_BYTES: 1048576,
          SESSION_TIMEOUT_MS: 30000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "notifications-service-staging",
          PROCESSING_TIMEOUT_MS: 5000,
          ENABLE_AUTO_COMMIT: false, // Manual commits for exactly-once
          AUTO_COMMIT_INTERVAL_MS: 5000,
          AUTO_COMMIT_THRESHOLD: 100,
        },
        ANALYTICS_CONSUMER: {
          MIN_BYTES: 1024,
          MAX_WAIT_TIME_MS: 100,
          MAX_BYTES: 2097152, // 2MB
          SESSION_TIMEOUT_MS: 45000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "analytics-service-staging",
          BATCH_PROCESSING_TIMEOUT_MS: 30000,
          MAX_BATCH_SIZE: 100,
          ENABLE_AUTO_COMMIT: false, // Manual commits for exactly-once
          AUTO_COMMIT_INTERVAL_MS: 10000,
          AUTO_COMMIT_THRESHOLD: 50,
        },
        MONITORING: {
          METRICS_INTERVAL_MS: 30000,
          ALERT_THRESHOLDS: {
            CONSUMER_LAG_CRITICAL: 100,
            CONSUMER_LAG_WARNING: 50,
            PROCESSING_TIME_CRITICAL_MS: 10000,
            PROCESSING_TIME_WARNING_MS: 5000,
            ERROR_RATE_CRITICAL: 0.1,
            ERROR_RATE_WARNING: 0.05,
          },
          HEALTH_CHECK: {
            INTERVAL_MS: 60000,
            TIMEOUT_MS: 5000,
          },
        },
        KEDA: {
          GLOBAL: {
            MIN_REPLICAS: 1,
            MAX_REPLICAS: 10,
            COOLDOWN_PERIOD_SECONDS: 300,
          },
          REAL_TIME: {
            LAG_THRESHOLD: 5,
            SCALE_UP_FACTOR: 1.5,
            SCALE_DOWN_FACTOR: 0.8,
            STABILIZATION_WINDOW_SECONDS: 60,
          },
          ANALYTICS: {
            LAG_THRESHOLD: 20,
            SCALE_UP_FACTOR: 2.0,
            SCALE_DOWN_FACTOR: 0.7,
            STABILIZATION_WINDOW_SECONDS: 120,
            THROUGHPUT_THRESHOLD: 1000,
            MEMORY_USAGE_THRESHOLD_PERCENT: 80,
          },
        },
        REDIS: {
          URL: "redis://localhost:6379",
          MAX_CONNECTIONS: 10,
          MIN_CONNECTIONS: 1,
          CONNECT_TIMEOUT_MS: 5000,
          COMMAND_TIMEOUT_MS: 3000,
          DEDUP_TTL_SECONDS: 3600,
          ANALYTICS_DEDUP_TTL_SECONDS: 7200,
          CONSUMER_KEY_PREFIX: "kafka:dedup:consumer:",
          ANALYTICS_KEY_PREFIX: "kafka:dedup:analytics:",
          HEALTH_CHECK_INTERVAL_MS: 30000,
          RETRY_ATTEMPTS: 3,
          RETRY_DELAY_MS: 1000,
          RATE_LIMIT: {
            ENABLED: true,
            MAX_REQUESTS: 500,
            WINDOW_MS: 900000, // 15 minutes
            BLOCK_DURATION: 60,
            KEY_PREFIX: "rate_limit:",
          },
        },
      };

    default: // development
      return {
        REAL_TIME_CONSUMER: {
          MIN_BYTES: 1,
          MAX_WAIT_TIME_MS: 0,
          MAX_BYTES: 1048576,
          SESSION_TIMEOUT_MS: 30000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "notifications-service-dev",
          PROCESSING_TIMEOUT_MS: 5000,
          ENABLE_AUTO_COMMIT: true, // Keep auto-commit for development ease
          AUTO_COMMIT_INTERVAL_MS: 5000,
          AUTO_COMMIT_THRESHOLD: 100,
        },
        ANALYTICS_CONSUMER: {
          MIN_BYTES: 512,
          MAX_WAIT_TIME_MS: 50,
          MAX_BYTES: 1048576,
          SESSION_TIMEOUT_MS: 30000,
          HEARTBEAT_INTERVAL_MS: 3000,
          GROUP_ID: "analytics-service-dev",
          BATCH_PROCESSING_TIMEOUT_MS: 15000,
          MAX_BATCH_SIZE: 50,
          ENABLE_AUTO_COMMIT: true, // Keep auto-commit for development ease
          AUTO_COMMIT_INTERVAL_MS: 10000,
          AUTO_COMMIT_THRESHOLD: 50,
        },
        MONITORING: {
          METRICS_INTERVAL_MS: 30000,
          ALERT_THRESHOLDS: {
            CONSUMER_LAG_CRITICAL: 50,
            CONSUMER_LAG_WARNING: 25,
            PROCESSING_TIME_CRITICAL_MS: 5000,
            PROCESSING_TIME_WARNING_MS: 2500,
            ERROR_RATE_CRITICAL: 0.05,
            ERROR_RATE_WARNING: 0.02,
          },
          HEALTH_CHECK: {
            INTERVAL_MS: 60000,
            TIMEOUT_MS: 5000,
          },
        },
        KEDA: {
          GLOBAL: {
            MIN_REPLICAS: 1,
            MAX_REPLICAS: 5,
            COOLDOWN_PERIOD_SECONDS: 300,
          },
          REAL_TIME: {
            LAG_THRESHOLD: 3,
            SCALE_UP_FACTOR: 1.2,
            SCALE_DOWN_FACTOR: 0.9,
            STABILIZATION_WINDOW_SECONDS: 30,
          },
          ANALYTICS: {
            LAG_THRESHOLD: 10,
            SCALE_UP_FACTOR: 1.5,
            SCALE_DOWN_FACTOR: 0.8,
            STABILIZATION_WINDOW_SECONDS: 60,
            THROUGHPUT_THRESHOLD: 500,
            MEMORY_USAGE_THRESHOLD_PERCENT: 75,
          },
        },
        REDIS: {
          URL: "redis://localhost:6379",
          MAX_CONNECTIONS: 5,
          MIN_CONNECTIONS: 1,
          CONNECT_TIMEOUT_MS: 5000,
          COMMAND_TIMEOUT_MS: 3000,
          DEDUP_TTL_SECONDS: 1800, // 30 minutes for development
          ANALYTICS_DEDUP_TTL_SECONDS: 3600, // 1 hour for analytics in dev
          CONSUMER_KEY_PREFIX: "kafka:dedup:consumer:",
          ANALYTICS_KEY_PREFIX: "kafka:dedup:analytics:",
          HEALTH_CHECK_INTERVAL_MS: 30000,
          RETRY_ATTEMPTS: 3,
          RETRY_DELAY_MS: 1000,
          RATE_LIMIT: {
            ENABLED: true,
            MAX_REQUESTS: 100,
            WINDOW_MS: 60000, // 1 minute for development
            BLOCK_DURATION: 30,
            KEY_PREFIX: "rate_limit:",
          },
        },
      };
  }
}

/**
 * Validate batch configuration
 */
export function validateBatchConfig(config = getBatchConfig()) {
  const errors: string[] = [];

  // Validate producer settings
  if (config.PRODUCER.BATCH_SIZE <= 0) {
    errors.push("PRODUCER.BATCH_SIZE must be greater than 0");
  }

  if (config.PRODUCER.BATCH_TIMEOUT_MS <= 0) {
    errors.push("PRODUCER.BATCH_TIMEOUT_MS must be greater than 0");
  }

  if (config.PRODUCER.MAX_BATCH_SIZE < config.PRODUCER.BATCH_SIZE) {
    errors.push("PRODUCER.MAX_BATCH_SIZE must be >= PRODUCER.BATCH_SIZE");
  }

  // Validate real-time consumer settings
  if (config.REAL_TIME_CONSUMER.MIN_BYTES < 0) {
    errors.push("REAL_TIME_CONSUMER.MIN_BYTES must be >= 0");
  }

  if (config.REAL_TIME_CONSUMER.MAX_WAIT_TIME_MS < 0) {
    errors.push("REAL_TIME_CONSUMER.MAX_WAIT_TIME_MS must be >= 0");
  }

  if (config.REAL_TIME_CONSUMER.MAX_BYTES <= 0) {
    errors.push("REAL_TIME_CONSUMER.MAX_BYTES must be greater than 0");
  }

  if (config.REAL_TIME_CONSUMER.SESSION_TIMEOUT_MS <= 0) {
    errors.push("REAL_TIME_CONSUMER.SESSION_TIMEOUT_MS must be greater than 0");
  }

  if (config.REAL_TIME_CONSUMER.HEARTBEAT_INTERVAL_MS <= 0) {
    errors.push("REAL_TIME_CONSUMER.HEARTBEAT_INTERVAL_MS must be greater than 0");
  }

  if (config.REAL_TIME_CONSUMER.PROCESSING_TIMEOUT_MS <= 0) {
    errors.push("REAL_TIME_CONSUMER.PROCESSING_TIMEOUT_MS must be greater than 0");
  }

  // Validate analytics consumer settings
  if (config.ANALYTICS_CONSUMER.MIN_BYTES <= 0) {
    errors.push("ANALYTICS_CONSUMER.MIN_BYTES must be greater than 0");
  }

  if (config.ANALYTICS_CONSUMER.MAX_WAIT_TIME_MS < 0) {
    errors.push("ANALYTICS_CONSUMER.MAX_WAIT_TIME_MS must be >= 0");
  }

  if (config.ANALYTICS_CONSUMER.MAX_BYTES <= 0) {
    errors.push("ANALYTICS_CONSUMER.MAX_BYTES must be greater than 0");
  }

  if (config.ANALYTICS_CONSUMER.SESSION_TIMEOUT_MS <= 0) {
    errors.push("ANALYTICS_CONSUMER.SESSION_TIMEOUT_MS must be greater than 0");
  }

  if (config.ANALYTICS_CONSUMER.HEARTBEAT_INTERVAL_MS <= 0) {
    errors.push("ANALYTICS_CONSUMER.HEARTBEAT_INTERVAL_MS must be greater than 0");
  }

  if (config.ANALYTICS_CONSUMER.BATCH_PROCESSING_TIMEOUT_MS <= 0) {
    errors.push("ANALYTICS_CONSUMER.BATCH_PROCESSING_TIMEOUT_MS must be greater than 0");
  }

  if (config.ANALYTICS_CONSUMER.MAX_BATCH_SIZE <= 0) {
    errors.push("ANALYTICS_CONSUMER.MAX_BATCH_SIZE must be greater than 0");
  }

  // Validate offset commit settings
  if (config.REAL_TIME_CONSUMER.ENABLE_AUTO_COMMIT === false) {
    if (config.REAL_TIME_CONSUMER.AUTO_COMMIT_INTERVAL_MS <= 0) {
      errors.push("REAL_TIME_CONSUMER.AUTO_COMMIT_INTERVAL_MS must be greater than 0 when auto-commit is disabled");
    }
    if (config.REAL_TIME_CONSUMER.AUTO_COMMIT_THRESHOLD <= 0) {
      errors.push("REAL_TIME_CONSUMER.AUTO_COMMIT_THRESHOLD must be greater than 0 when auto-commit is disabled");
    }
  }

  if (config.ANALYTICS_CONSUMER.ENABLE_AUTO_COMMIT === false) {
    if (config.ANALYTICS_CONSUMER.AUTO_COMMIT_INTERVAL_MS <= 0) {
      errors.push("ANALYTICS_CONSUMER.AUTO_COMMIT_INTERVAL_MS must be greater than 0 when auto-commit is disabled");
    }
    if (config.ANALYTICS_CONSUMER.AUTO_COMMIT_THRESHOLD <= 0) {
      errors.push("ANALYTICS_CONSUMER.AUTO_COMMIT_THRESHOLD must be greater than 0 when auto-commit is disabled");
    }
  }

  // Validate monitoring settings (simplified)
  if (config.MONITORING.METRICS_INTERVAL_MS <= 0) {
    errors.push("MONITORING.METRICS_INTERVAL_MS must be greater than 0");
  }

  if (config.MONITORING.ALERT_THRESHOLDS.CONSUMER_LAG_CRITICAL <= 0) {
    errors.push("MONITORING.ALERT_THRESHOLDS.CONSUMER_LAG_CRITICAL must be greater than 0");
  }

  // Validate KEDA settings (simplified)
  if (config.KEDA.GLOBAL.MAX_REPLICAS <= config.KEDA.GLOBAL.MIN_REPLICAS) {
    errors.push("KEDA.GLOBAL.MAX_REPLICAS must be > MIN_REPLICAS");
  }

  if (config.KEDA.REAL_TIME.LAG_THRESHOLD <= 0) {
    errors.push("KEDA.REAL_TIME.LAG_THRESHOLD must be greater than 0");
  }

  if (config.KEDA.ANALYTICS.LAG_THRESHOLD <= 0) {
    errors.push("KEDA.ANALYTICS.LAG_THRESHOLD must be greater than 0");
  }

  // Validate topic settings
  if (config.TOPICS.PARTITIONS <= 0) {
    errors.push("TOPICS.PARTITIONS must be greater than 0");
  }

  if (config.TOPICS.REPLICATION_FACTOR <= 0) {
    errors.push("TOPICS.REPLICATION_FACTOR must be greater than 0");
  }

  // Validate Redis settings (simplified)
  if (config.REDIS.DEDUP_TTL_SECONDS <= 0) {
    errors.push("REDIS.DEDUP_TTL_SECONDS must be greater than 0");
  }

  if (config.REDIS.ANALYTICS_DEDUP_TTL_SECONDS <= 0) {
    errors.push("REDIS.ANALYTICS_DEDUP_TTL_SECONDS must be greater than 0");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid batch configuration: ${errors.join(", ")}`);
  }

  return true;
}
