import { Worker } from "worker_threads";
import path from "path";
import { 
  PRODUCT_CREATED, 
  PRODUCT_UPDATED, 
  PRODUCT_DELETED, 
  LOW_STOCK_WARNING,
  Event,
  EventSchema
} from '@project/shared';
import { saveEvent } from '../storage/dynamoClient';
import { saveArchiveEvent } from '../storage/s3Client';
import analyticsKafkaManager from '../kafka/connectionManager';

// In-memory cache for deduplication (in production, use Redis)
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

function addToProcessedCache(messageId: string) {
  if (processedMessages.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (simple FIFO)
    const iterator = processedMessages.values();
    for (let i = 0; i < 1000; i++) {
      const next = iterator.next();
      if (!next.done && next.value) {
        processedMessages.delete(next.value);
      }
    }
  }
  processedMessages.add(messageId);
}

function isMessageProcessed(messageId: string): boolean {
  return processedMessages.has(messageId);
}

// Spawn aggregator worker thread
const aggregatorWorker = new Worker(path.resolve(__dirname, "../workers/aggregatorWorker.ts"));

aggregatorWorker.on("message", (msg) => {
  if (msg.type === "aggregatesUpdated") {
    console.log("📈 [AnalyticsConsumer] Aggregates updated:", msg.aggregates);
  } else if (msg.type === "error") {
    console.error("❌ [AnalyticsConsumer] Aggregator worker error:", msg.error);
  }
});

aggregatorWorker.on("error", (error) => {
  console.error("❌ [AnalyticsConsumer] Aggregator worker thread error:", error);
});

/**
 * Process individual event through the analytics pipeline
 */
async function handleEvent(topic: string, rawMessage: string): Promise<void> {
  try {
    // Parse and validate the event
    const eventData = JSON.parse(rawMessage);
    const event = EventSchema.parse(eventData);

    console.log(`📊 [AnalyticsConsumer] Processing ${topic} event:`, event.id);

    // Run analytics pipeline in parallel
    const promises = [
      // 1) Save to DynamoDB for real-time analytics
      saveEvent(event),
      
      // 2) Archive to S3/MinIO for long-term storage
      saveArchiveEvent(event),
      
      // 3) Update aggregates via worker thread
      new Promise<void>((resolve) => {
        aggregatorWorker.postMessage({
          type: "processEvent",
          event: event
        });
        resolve(); // Don't wait for worker response
      })
    ];

    await Promise.all(promises);
    console.log(`✅ [AnalyticsConsumer] Successfully processed event ${event.id}`);

  } catch (error) {
    console.error(`❌ [AnalyticsConsumer] Failed to process event from ${topic}:`, error);
    throw error;
  }
}

/**
 * Start the analytics consumer
 */
export async function startAnalyticsConsumer(): Promise<void> {
  console.log("🚀 [AnalyticsConsumer] Starting analytics service...");

  // Get the analytics consumer instance
  const consumer = await analyticsKafkaManager.getConsumer();

  // Subscribe to all analytics topics
  await consumer.subscribe({ topic: PRODUCT_CREATED });
  await consumer.subscribe({ topic: PRODUCT_UPDATED });
  await consumer.subscribe({ topic: PRODUCT_DELETED });
  await consumer.subscribe({ topic: LOW_STOCK_WARNING });

  console.log("✅ [AnalyticsConsumer] Subscribed to all event topics");

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
      const processedOffsets: { topic: string; partition: number; offset: string }[] = [];
      const batchStartTime = Date.now();

      console.log(`📦 [AnalyticsConsumer] Processing batch: ${batch.messages.length} messages from ${batch.topic}:${batch.partition}`);

      for (const message of batch.messages) {
        // Send heartbeat periodically during batch processing
        await heartbeat();

        if (!message.value) continue;

        // Create unique message ID for deduplication
        const messageId = `${batch.topic}-${batch.partition}-${message.offset}`;

        // Skip if already processed
        if (isMessageProcessed(messageId)) {
          console.log(`⏭️  [AnalyticsConsumer] Skipping duplicate message: ${messageId}`);
          resolveOffset(message.offset);
          continue;
        }

        try {
          await handleEvent(batch.topic, message.value.toString());

          // Mark as processed
          addToProcessedCache(messageId);

          // Resolve offset immediately after successful processing
          resolveOffset(message.offset);

          // Collect offset for manual commit
          processedOffsets.push({
            topic: batch.topic,
            partition: batch.partition,
            offset: message.offset
          });

        } catch (err) {
          console.error(`❌ [AnalyticsConsumer] Failed to process message ${messageId}:`, err);
          // Don't resolve offset for failed messages - they will be retried
        }
      }

      // Manual acknowledgment: commit offsets for successfully processed messages
      if (processedOffsets.length > 0) {
        await commitOffsetsIfNecessary();
        const processingTime = Date.now() - batchStartTime;
        console.log(`✅ [AnalyticsConsumer] Batch processed: ${processedOffsets.length}/${batch.messages.length} messages in ${processingTime}ms`);
      }
    },
  });
}

/**
 * Get current analytics metrics
 */
export function getMetrics(): Promise<any> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ error: 'Timeout getting metrics' });
    }, 5000);

    const messageHandler = (msg: any) => {
      if (msg.type === "currentAggregates") {
        clearTimeout(timeout);
        aggregatorWorker.off("message", messageHandler);
        resolve(msg.aggregates);
      }
    };

    aggregatorWorker.on("message", messageHandler);
    aggregatorWorker.postMessage({ type: "getAggregates" });
  });
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  console.log("🛑 [AnalyticsConsumer] Shutting down analytics consumer...");
  
  try {
    await aggregatorWorker.terminate();
    await analyticsKafkaManager.shutdown();
    console.log("✅ [AnalyticsConsumer] Shutdown completed");
  } catch (error) {
    console.error("❌ [AnalyticsConsumer] Error during shutdown:", error);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);