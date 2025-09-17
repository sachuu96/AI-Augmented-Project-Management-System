import { getBatchConfig, validateBatchConfig, BATCH_CONFIG } from '../src/events/batchConfig';

describe('Batch Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should provide default batch configuration', () => {
      const config = getBatchConfig();
      
      // In test environment, should use test configuration
      expect(config.PRODUCER.BATCH_SIZE).toBe(5);
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(100);
      expect(config.PRODUCER.MAX_BATCH_SIZE).toBe(10);
      expect(config.CONSUMER.MIN_BYTES).toBe(1);
      expect(config.CONSUMER.MAX_WAIT_TIME_MS).toBe(50);
      expect(config.SCALING.LAG_THRESHOLD).toBe(10);
    });

    it('should include high priority topics configuration', () => {
      const config = getBatchConfig();
      
      expect(config.SCALING.HIGH_PRIORITY_TOPICS).toContain('LowStockWarning');
      expect(config.SCALING.HIGH_PRIORITY_LAG_THRESHOLD).toBe(5);
    });

    it('should include topic configuration', () => {
      const config = getBatchConfig();
      
      expect(config.TOPICS.PARTITIONS).toBe(3);
      expect(config.TOPICS.REPLICATION_FACTOR).toBe(1);
    });
  });

  describe('Environment Variable Override', () => {
    it('should override batch size from environment variable', () => {
      process.env.KAFKA_BATCH_SIZE = '75';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_SIZE).toBe(75);
    });

    it('should override batch timeout from environment variable', () => {
      process.env.KAFKA_BATCH_TIMEOUT_MS = '750';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(750);
    });

    it('should override consumer settings from environment variables', () => {
      process.env.KAFKA_CONSUMER_MIN_BYTES = '2048';
      process.env.KAFKA_CONSUMER_MAX_WAIT_MS = '200';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.CONSUMER.MIN_BYTES).toBe(2048);
      expect(config.CONSUMER.MAX_WAIT_TIME_MS).toBe(200);
    });

    it('should override scaling thresholds from environment variables', () => {
      process.env.KEDA_LAG_THRESHOLD = '25';
      process.env.KEDA_HIGH_PRIORITY_LAG_THRESHOLD = '10';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.SCALING.LAG_THRESHOLD).toBe(25);
      expect(config.SCALING.HIGH_PRIORITY_LAG_THRESHOLD).toBe(10);
    });

    it('should override high priority topics from environment variable', () => {
      process.env.KEDA_HIGH_PRIORITY_TOPICS = 'LowStockWarning,ProductDeleted';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.SCALING.HIGH_PRIORITY_TOPICS).toEqual(['LowStockWarning', 'ProductDeleted']);
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should provide production configuration', () => {
      process.env.NODE_ENV = 'production';
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_SIZE).toBe(100);
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(1000);
      expect(config.PRODUCER.MAX_BATCH_SIZE).toBe(500);
      expect(config.CONSUMER.MIN_BYTES).toBe(2048);
      expect(config.CONSUMER.MAX_WAIT_TIME_MS).toBe(200);
    });

    it('should provide test configuration', () => {
      process.env.NODE_ENV = 'test';
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_SIZE).toBe(5);
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(100);
      expect(config.PRODUCER.MAX_BATCH_SIZE).toBe(10);
      expect(config.CONSUMER.MIN_BYTES).toBe(1);
      expect(config.CONSUMER.MAX_WAIT_TIME_MS).toBe(50);
    });

    it('should provide development configuration by default', () => {
      process.env.NODE_ENV = 'development';
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_SIZE).toBe(50);
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(500);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const config = getBatchConfig();
      expect(() => validateBatchConfig(config)).not.toThrow();
      expect(validateBatchConfig(config)).toBe(true);
    });

    it('should reject configuration with invalid batch size', () => {
      const config = {
        ...getBatchConfig(),
        PRODUCER: {
          ...getBatchConfig().PRODUCER,
          BATCH_SIZE: 0,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow('PRODUCER.BATCH_SIZE must be greater than 0');
    });

    it('should reject configuration with invalid batch timeout', () => {
      const config = {
        ...getBatchConfig(),
        PRODUCER: {
          ...getBatchConfig().PRODUCER,
          BATCH_TIMEOUT_MS: -1,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow('PRODUCER.BATCH_TIMEOUT_MS must be greater than 0');
    });

    it('should reject configuration where max batch size is less than batch size', () => {
      const config = {
        ...getBatchConfig(),
        PRODUCER: {
          ...getBatchConfig().PRODUCER,
          BATCH_SIZE: 100,
          MAX_BATCH_SIZE: 50,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow('PRODUCER.MAX_BATCH_SIZE must be >= PRODUCER.BATCH_SIZE');
    });

    it('should reject configuration with invalid consumer settings', () => {
      const config = {
        ...getBatchConfig(),
        CONSUMER: {
          ...getBatchConfig().CONSUMER,
          MIN_BYTES: 0,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow('CONSUMER.MIN_BYTES must be greater than 0');
    });

    it('should reject configuration with invalid scaling threshold', () => {
      const config = {
        ...getBatchConfig(),
        SCALING: {
          ...getBatchConfig().SCALING,
          LAG_THRESHOLD: 0,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow('SCALING.LAG_THRESHOLD must be greater than 0');
    });

    it('should collect multiple validation errors', () => {
      const config = {
        ...getBatchConfig(),
        PRODUCER: {
          ...getBatchConfig().PRODUCER,
          BATCH_SIZE: 0,
          BATCH_TIMEOUT_MS: -1,
        },
        CONSUMER: {
          ...getBatchConfig().CONSUMER,
          MIN_BYTES: 0,
        },
      };
      
      expect(() => validateBatchConfig(config)).toThrow(/PRODUCER\.BATCH_SIZE.*PRODUCER\.BATCH_TIMEOUT_MS.*CONSUMER\.MIN_BYTES/);
    });
  });

  describe('Configuration Constants', () => {
    it('should export BATCH_CONFIG constant', () => {
      expect(BATCH_CONFIG).toBeDefined();
      expect(BATCH_CONFIG.PRODUCER).toBeDefined();
      expect(BATCH_CONFIG.CONSUMER).toBeDefined();
      expect(BATCH_CONFIG.SCALING).toBeDefined();
      expect(BATCH_CONFIG.TOPICS).toBeDefined();
    });

    it('should have consistent default values', () => {
      expect(BATCH_CONFIG.PRODUCER.BATCH_SIZE).toBe(50);
      expect(BATCH_CONFIG.CONSUMER.MIN_BYTES).toBe(1024);
      expect(BATCH_CONFIG.SCALING.LAG_THRESHOLD).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing environment variables gracefully', () => {
      // Clear all relevant environment variables
      delete process.env.KAFKA_BATCH_SIZE;
      delete process.env.KAFKA_BATCH_TIMEOUT_MS;
      delete process.env.KEDA_LAG_THRESHOLD;
      process.env.NODE_ENV = 'development'; // Use development defaults
      
      const config = getBatchConfig();
      expect(config.PRODUCER.BATCH_SIZE).toBe(50); // development default
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(500); // development default
      expect(config.SCALING.LAG_THRESHOLD).toBe(10); // default
    });

    it('should handle invalid environment variable values', () => {
      process.env.KAFKA_BATCH_SIZE = 'invalid';
      process.env.KAFKA_BATCH_TIMEOUT_MS = 'not-a-number';
      process.env.NODE_ENV = 'development'; // Use development defaults
      
      const config = getBatchConfig();
      // Should fall back to defaults when parseInt returns NaN
      expect(config.PRODUCER.BATCH_SIZE).toBe(50);
      expect(config.PRODUCER.BATCH_TIMEOUT_MS).toBe(500);
    });

    it('should handle empty high priority topics string', () => {
      process.env.KEDA_HIGH_PRIORITY_TOPICS = '';
      process.env.NODE_ENV = 'development'; // Override test environment
      
      const config = getBatchConfig();
      expect(config.SCALING.HIGH_PRIORITY_TOPICS).toEqual(['']);
    });
  });
});