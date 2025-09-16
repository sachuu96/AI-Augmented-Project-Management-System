import { Worker } from "worker_threads";
import { saveEvent as saveEventToDynamo } from "./DynamoDBDocumentClient";
import { saveArchiveEvent } from "./s3Client";
import { PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, LOW_STOCK_WARNING } from "../shared";
import kafkaConnectionManager from "../src/kafka/connectionManager";
import { getBatchConfig } from "../src/events/batchConfig";
import redisConnectionManager from "../src/events/redisConnectionManager";

// Get Redis configuration from centralized config
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
  const redisKey = `${config.REDIS.ANALYTICS_KEY_PREFIX}${messageId}`;

  // Try Redis first
  if (config.REDIS.ENABLED) {
    try {
      return await redisConnectionManager.isMessageProcessed(redisKey);
    } catch (error) {
      console.error('[Analytics Redis] Error checking message:', error);
      // Fall back to in-memory cache
    }
  }

  // Fallback to in-memory cache
  return processedMessages.has(messageId);
}

// Mark message as processed
async function markMessageProcessed(messageId: string): Promise<void> {
  const redisKey = `${config.REDIS.ANALYTICS_KEY_PREFIX}${messageId}`;

  // Try Redis first
  if (config.REDIS.ENABLED) {
    try {
      await redisConnectionManager.markMessageProcessed(redisKey, config.REDIS.ANALYTICS_DEDUP_TTL_SECONDS);
      return;
    } catch (error) {
      console.error('[Analytics Redis] Error marking message:', error);
      // Fall back to in-memory cache
    }
  }

  // Fallback to in-memory cache
  addToProcessedCache(messageId);
}



// 🧵 Spawn worker thread
const aggregatorWorker = new Worker(require.resolve("./aggregatorWorker"));

aggregatorWorker.on("message", (msg) => {
  if (msg.type === "aggregatesUpdated") {
    console.log("📈 Aggregates updated (from worker):", msg.aggregates);
  }
});

async function handleEvent(topic: string, rawMessage: string) {
  const event = JSON.parse(rawMessage);

  console.log(`📊 Analytics got event ${topic}`, event);

  // 1) Save to DynamoDB
  await saveEventToDynamo(event);

  // 2) Archive to MinIO/S3
  await saveArchiveEvent(event);

  // 3) Offload to worker thread
  aggregatorWorker.postMessage(event);
}

export async function runAnalyticsWorker() {
  // Get the centralized analytics consumer instance with analytics-specific configuration
  const consumer = await kafkaConnectionManager.getAnalyticsConsumer();

  // Subscribe to all analytics topics
  await consumer.subscribe({ topic: PRODUCT_CREATED });
  await consumer.subscribe({ topic: PRODUCT_UPDATED });
  await consumer.subscribe({ topic: PRODUCT_DELETED });
  await consumer.subscribe({ topic: LOW_STOCK_WARNING });

  console.log("✅ Analytics service listening to events...");

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, uncommittedOffsets }) => {
      const processedOffsets: { topic: string; partition: number; offset: string }[] = [];
      const failedMessages: string[] = [];

      for (let message of batch.messages) {
        if (!message.value) continue;

        // Create unique message ID for deduplication
        const messageId = `${batch.topic}-${batch.partition}-${message.offset}`;

        // Skip if already processed
        if (await isMessageProcessed(messageId)) {
          console.log(`Analytics: Skipping duplicate message: ${messageId}`);
          continue;
        }

        try {
          await handleEvent(batch.topic, message.value.toString());

          // Mark as processed
          await markMessageProcessed(messageId);

          // Collect offset for manual commit
          processedOffsets.push({
            topic: batch.topic,
            partition: batch.partition,
            offset: (parseInt(message.offset) + 1).toString() // Next offset to commit
          });

          console.log(`Analytics: Processed message: ${messageId}`);
        } catch (err) {
          console.error(`Analytics: Failed to process message ${messageId}:`, err);
          failedMessages.push(messageId);
          // Don't include failed messages in commit to maintain exactly-once semantics
        }
      }

      // Manual offset commit for exactly-once semantics
      if (!config.ANALYTICS_CONSUMER.ENABLE_AUTO_COMMIT) {
        if (processedOffsets.length > 0) {
          await consumer.commitOffsets(processedOffsets);
          console.log(`Analytics: Manually committed offsets for ${processedOffsets.length} messages`);
        }

        if (failedMessages.length > 0) {
          console.warn(`Analytics: Skipped committing offsets for ${failedMessages.length} failed messages:`, failedMessages);
        }
      } else {
        // If auto-commit is enabled, still log for monitoring
        if (processedOffsets.length > 0) {
          console.log(`Analytics: Auto-committed offsets for ${processedOffsets.length} messages`);
        }
      }

      // Send heartbeat to maintain group membership
      await heartbeat();
    },
  });
}

