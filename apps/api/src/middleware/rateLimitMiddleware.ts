import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisConnectionManager from '../events/redisConnectionManager';
import { getBatchConfig } from '../events/batchConfig';

// Get configuration from centralized config
const config = getBatchConfig();

// Initialize rate limiter with centralized Redis client
let rateLimiter: RateLimiterRedis | null = null;

async function initializeRateLimiter() {
  if (rateLimiter) return rateLimiter;

  try {
    const redisClient = await redisConnectionManager.getClient();

    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: config.REDIS.RATE_LIMIT.KEY_PREFIX,
      points: config.REDIS.RATE_LIMIT.MAX_REQUESTS,
      duration: Math.floor(config.REDIS.RATE_LIMIT.WINDOW_MS / 1000),
      blockDuration: config.REDIS.RATE_LIMIT.BLOCK_DURATION,
    });

    console.log('[RateLimitMiddleware] Rate limiter initialized with centralized Redis client');
    return rateLimiter;
  } catch (error) {
    console.error('[RateLimitMiddleware] Failed to initialize rate limiter:', error);
    // Return null to indicate Redis is not available
    return null;
  }
}

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sellerId = (req as any).sellerId;
    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID not found' });
    }

    // Check if rate limiting is enabled
    if (!config.REDIS.RATE_LIMIT.ENABLED) {
      return next();
    }

    // Initialize rate limiter if not already done
    if (!rateLimiter) {
      rateLimiter = await initializeRateLimiter();
    }

    // If Redis is not available, skip rate limiting
    if (!rateLimiter) {
      console.warn('[RateLimitMiddleware] Redis not available, skipping rate limiting');
      return next();
    }

    await rateLimiter.consume(sellerId);
    next();
  } catch (rejRes: any) {
    // Check if it's a rate limit exceeded error
    if (rejRes.remainingPoints !== undefined && rejRes.remainingPoints < 0) {
      const msBeforeNext = rejRes.msBeforeNext || 0;
      res.set('Retry-After', String(Math.round(msBeforeNext / 1000)));
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(msBeforeNext / 1000),
      });
    } else {
      // Redis connection error or other issue, allow request but log
      console.error('[RateLimitMiddleware] Rate limiter error:', rejRes);
      next();
    }
  }
};