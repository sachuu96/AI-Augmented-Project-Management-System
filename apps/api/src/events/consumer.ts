import { pushEvent } from "../sse";
import { PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../../shared';
import kafkaConnectionManager from "../kafka/connectionManager";
import { getBatchConfig } from './batchConfig';
import redisConnectionManager from './redisConnectionManager';

// Get configuration from centralized config
const config = getBatchConfig();

// Fallback in-memory cache
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

// Fallback in-memory cache management
function addToProcessedCache(messageId: string) {
  if (processedMessages.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (simple FIFO)
    const iterator = processedMessages.values();
    for (let i = 0; i < 1000; i++) {
      processedMessages.delete(iterator.next().value);
    }
  }
  processedMessages.add(messageId);
}

// Check if message was already processed
async function isMessageProcessed(messageId: string): Promise<boolean> {
  const redisKey = `${config.REDIS.CONSUMER_KEY_PREFIX}${messageId}`;

  // Try Redis first
  if (config.REDIS.ENABLED) {
    try {
      return await redisConnectionManager.isMessageProcessed(redisKey);
    } catch (error) {
      console.error('[Consumer Redis] Error checking message:', error);
      // Fall back to in-memory cache
    }
  }

  // Fallback to in-memory cache
  return processedMessages.has(messageId);
}

// Mark message as processed
async function markMessageProcessed(messageId: string): Promise<void> {
  const redisKey = `${config.REDIS.CONSUMER_KEY_PREFIX}${messageId}`;

  // Try Redis first
  if (config.REDIS.ENABLED) {
    try {
      await redisConnectionManager.markMessageProcessed(redisKey, config.REDIS.DEDUP_TTL_SECONDS);
      return;
    } catch (error) {
      console.error('[Consumer Redis] Error marking message:', error);
      // Fall back to in-memory cache
    }
  }

  // Fallback to in-memory cache
  addToProcessedCache(messageId);
}

export async function startConsumer() {
  // Get the centralized consumer instance
  const consumer = await kafkaConnectionManager.getConsumer();

  // Subscribe to all event topics
  // refactored: set fromBeginning to (default) false so that consumer will start the consumption from
  // latest offset
  await consumer.subscribe({ topic: PRODUCT_CREATED });
  await consumer.subscribe({ topic: PRODUCT_UPDATED});
  await consumer.subscribe({ topic: PRODUCT_DELETED});
  await consumer.subscribe({ topic: LOW_STOCK_WARNING });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      // Create unique message ID for deduplication
      const messageId = `${topic}-${partition}-${message.offset}`;

      // Skip if already processed
      if (await isMessageProcessed(messageId)) {
        console.log(`Skipping duplicate message: ${messageId}`);
        return;
      }

      try {
        const event = JSON.parse(message.value?.toString() || "{}");
        event.type = topic; // ensure we have the event type

        // Process the event in real-time
        pushEvent(event);

        // Mark as processed
        await markMessageProcessed(messageId);

        // Manual offset commit for exactly-once semantics
        if (!config.REAL_TIME_CONSUMER.ENABLE_AUTO_COMMIT) {
          await consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString(),
          }]);
          console.log(`[Consumer] Manually committed offset for message: ${messageId}`);
        }

        console.log(`[Consumer] Processed real-time message: ${messageId} from ${topic}:${partition}`);

      } catch (err) {
        console.error(`Failed to process Kafka message ${messageId}:`, err);
        // In real-time processing, failed messages will be retried by Kafka
        // Don't commit failed messages to maintain exactly-once semantics
        throw err; // Re-throw to prevent auto-commit
      }
    },
  });
}

