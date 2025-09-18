import { 
  PRODUCT_CREATED, 
  PRODUCT_UPDATED, 
  PRODUCT_DELETED, 
  LOW_STOCK_WARNING,
  Event,
  EventSchema
} from '@project/shared';
import { broadcastEvent } from '../handlers/sseHandler';
import notificationsKafkaManager from '../kafka/connectionManager';

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

/**
 * Process individual event for real-time notifications
 */
async function handleEvent(topic: string, rawMessage: string): Promise<void> {
  try {
    // Parse and validate the event
    const eventData = JSON.parse(rawMessage);
    const event = EventSchema.parse(eventData);

    console.log(`🔔 [NotificationsConsumer] Processing ${topic} event:`, event.id);

    // Broadcast event to all connected SSE clients
    broadcastEvent(event);

    console.log(`✅ [NotificationsConsumer] Successfully broadcasted event ${event.id}`);

  } catch (error) {
    console.error(`❌ [NotificationsConsumer] Failed to process event from ${topic}:`, error);
    throw error;
  }
}

/**
 * Start the notifications consumer
 */
export async function startNotificationsConsumer(): Promise<void> {
  console.log("🚀 [NotificationsConsumer] Starting notifications service...");

  // Get the notifications consumer instance
  const consumer = await notificationsKafkaManager.getConsumer();

  // Subscribe to all notification topics
  await consumer.subscribe({ topic: PRODUCT_CREATED });
  await consumer.subscribe({ topic: PRODUCT_UPDATED });
  await consumer.subscribe({ topic: PRODUCT_DELETED });
  await consumer.subscribe({ topic: LOW_STOCK_WARNING });

  console.log("✅ [NotificationsConsumer] Subscribed to all event topics");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      // Create unique message ID for deduplication
      const messageId = `${topic}-${partition}-${message.offset}`;

      // Skip if already processed
      if (isMessageProcessed(messageId)) {
        console.log(`⏭️  [NotificationsConsumer] Skipping duplicate message: ${messageId}`);
        return;
      }

      try {
        await handleEvent(topic, message.value.toString());

        // Mark as processed
        addToProcessedCache(messageId);

        console.log(`✅ [NotificationsConsumer] Processed message: ${messageId}`);
      } catch (err) {
        console.error(`❌ [NotificationsConsumer] Failed to process message ${messageId}:`, err);
        // For notifications, we don't want to block on failures
        // Log the error and continue processing other messages
      }
    },
  });
}

/**
 * Get consumer metrics
 */
export function getMetrics() {
  return {
    processedMessagesCount: processedMessages.size,
    maxCacheSize: MAX_CACHE_SIZE,
    timestamp: new Date().toISOString()
  };
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  console.log("🛑 [NotificationsConsumer] Shutting down notifications consumer...");
  
  try {
    await notificationsKafkaManager.shutdown();
    console.log("✅ [NotificationsConsumer] Shutdown completed");
  } catch (error) {
    console.error("❌ [NotificationsConsumer] Error during shutdown:", error);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);