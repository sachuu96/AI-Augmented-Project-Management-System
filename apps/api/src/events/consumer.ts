import { pushEvent } from "../sse";
import { PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../../shared';
import { getBatchConfig } from "./batchConfig";
import kafkaConnectionManager from "../kafka/connectionManager";

// In-memory cache for deduplication (in production, use Redis)
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

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

function isMessageProcessed(messageId: string): boolean {
  return processedMessages.has(messageId);
}

// Get optimized batch configuration
const batchConfig = getBatchConfig();

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
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, uncommittedOffsets }) => {
      const processedOffsets: { topic: string; partition: number; offset: string }[] = [];
      const batchStartTime = Date.now();

      console.log(`[Consumer] Processing batch: ${batch.messages.length} messages from ${batch.topic}:${batch.partition}`);

      for (let message of batch.messages) {
        // Send heartbeat periodically during batch processing
        await heartbeat();

        // Create unique message ID for deduplication
        const messageId = `${batch.topic}-${batch.partition}-${message.offset}`;

        // Skip if already processed
        if (isMessageProcessed(messageId)) {
          console.log(`Skipping duplicate message: ${messageId}`);
          resolveOffset(message.offset);
          continue;
        }

        try {
          const event = JSON.parse(message.value?.toString() || "{}");
          event.type = batch.topic; // ensure we have the event type

          // Process the event
          pushEvent(event);

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
          console.error(`Failed to process Kafka message ${messageId}:`, err);
          // Don't resolve offset for failed messages - they will be retried
        }
      }

      // Manual acknowledgment: commit offsets for successfully processed messages
      if (processedOffsets.length > 0) {
        await commitOffsetsIfNecessary();
        const processingTime = Date.now() - batchStartTime;
        console.log(`[Consumer] Batch processed: ${processedOffsets.length}/${batch.messages.length} messages in ${processingTime}ms`);
      }
    },
  });
}
