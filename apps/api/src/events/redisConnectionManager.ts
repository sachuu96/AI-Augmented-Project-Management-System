import { createClient, RedisClientType } from 'redis';
import { getBatchConfig } from './batchConfig';

/**
 * Centralized Redis Connection Manager
 * Manages Redis connections for deduplication and caching across the application
 */
class RedisConnectionManager {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private config = getBatchConfig();

  /**
   * Get or create Redis client instance
   */
  async getClient(): Promise<RedisClientType> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    // Prevent multiple connection attempts
    if (this.connectionPromise) {
      await this.connectionPromise;
      return this.client!;
    }

    // Create new connection
    this.connectionPromise = this.connect();
    try {
      await this.connectionPromise;
      return this.client!;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Connect to Redis with retry logic
   */
  private async connect(): Promise<void> {
    if (this.isConnected) return;

    const maxRetries = this.config.REDIS.RETRY_ATTEMPTS || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.client = createClient({
          url: this.config.REDIS.URL,
          socket: {
            connectTimeout: this.config.REDIS.CONNECT_TIMEOUT_MS,
          },
        });

        // Set up event handlers
        this.client.on('error', (err) => {
          console.error('[RedisConnectionManager] Connection error:', err.message);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('[RedisConnectionManager] Connected successfully');
          this.isConnected = true;
        });

        this.client.on('disconnect', () => {
          console.log('[RedisConnectionManager] Disconnected');
          this.isConnected = false;
        });

        await this.client.connect();
        return;

      } catch (error) {
        console.error(`[RedisConnectionManager] Connection attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt === maxRetries) {
          throw new Error(`Failed to connect to Redis after ${maxRetries} attempts`);
        }

        // Wait before retrying
        const delay = this.config.REDIS.RETRY_DELAY_MS || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Check if message was already processed (for deduplication)
   */
  async isMessageProcessed(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[RedisConnectionManager] Error checking message:', error);
      return false; // Default to not processed on error
    }
  }

  /**
   * Mark message as processed with TTL
   */
  async markMessageProcessed(key: string, ttlSeconds?: number): Promise<void> {
    try {
      const client = await this.getClient();
      const ttl = ttlSeconds || this.config.REDIS.DEDUP_TTL_SECONDS;
      await client.setEx(key, ttl, '1');
    } catch (error) {
      console.error('[RedisConnectionManager] Error marking message:', error);
      // Don't throw - allow processing to continue
    }
  }

  /**
   * Get connection status for health checks
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      hasClient: this.client !== null,
      config: {
        url: this.config.REDIS.URL,
        enabled: this.config.REDIS.ENABLED,
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[RedisConnectionManager] Starting graceful shutdown...');

    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        console.log('[RedisConnectionManager] Disconnected gracefully');
      } catch (error) {
        console.error('[RedisConnectionManager] Error during shutdown:', error);
      }
    }
  }

  /**
   * Health check for readiness probes
   */
  async healthCheck(): Promise<{ status: string; details: any; error?: string }> {
    try {
      if (!this.config.REDIS.ENABLED) {
        return {
          status: 'disabled',
          details: { enabled: false }
        };
      }

      const client = await this.getClient();
      await client.ping();

      return {
        status: 'healthy',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: this.getConnectionStatus(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
const redisConnectionManager = new RedisConnectionManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[RedisConnectionManager] Received SIGTERM, shutting down...');
  await redisConnectionManager.shutdown();
});

process.on('SIGINT', async () => {
  console.log('[RedisConnectionManager] Received SIGINT, shutting down...');
  await redisConnectionManager.shutdown();
});

export { redisConnectionManager };
export default redisConnectionManager;