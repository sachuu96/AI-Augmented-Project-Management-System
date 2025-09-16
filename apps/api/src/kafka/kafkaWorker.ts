import { parentPort } from 'worker_threads';
import kafkaConnectionManager from './connectionManager';

// Message types for worker communication
interface WorkerMessage {
  correlationId: string;
  type: 'batch' | 'single';
  batchType?: string;
  events?: Array<{ type: string; payload: any }>;
  eventType?: string;
  payload?: any;
}

interface WorkerResponse {
  correlationId: string;
  success: boolean;
  error?: string;
}

/**
 * Partition key generation for consistent message routing
 */
function getPartitionKey(type: string, payload: any): string {
  switch (type) {
    case 'ProductCreated':
    case 'ProductUpdated':
      return payload.product?.id || payload.id || 'default';
    case 'ProductDeleted':
    case 'LowStockWarning':
      return payload.productId || payload.id || 'default';
    default:
      return 'default';
  }
}

/**
 * Send messages using transactional publishing for critical operations
 */
async function sendTransactional(producer: any, topic: string, messages: any[]) {
  const transaction = await producer.transaction();
  try {
    await transaction.send({ topic, messages });
    await transaction.commit();
  } catch (err) {
    await transaction.abort();
    throw err;
  }
}

/**
 * Determine if an event type requires transactional publishing
 */
function requiresTransaction(eventType: string): boolean {
  return eventType === 'ProductCreated' || eventType === 'ProductDeleted';
}

/**
 * Process worker messages using centralized Kafka connection
 */
async function processMessage(msg: WorkerMessage): Promise<void> {
  const { correlationId, type, payload, batchType, events, eventType } = msg;

  try {
    // Get the shared producer instance
    const producer = await kafkaConnectionManager.getProducer();

    if (type === 'batch' && events && Array.isArray(events) && batchType) {
      // Handle batch processing
      const messages = events.map(event => ({
        key: getPartitionKey(event.type, event.payload),
        value: JSON.stringify(event.payload),
        timestamp: Date.now().toString()
      }));

      // Use transactional publishing for critical operations
      if (requiresTransaction(batchType)) {
        await sendTransactional(producer, batchType, messages);
      } else {
        await producer.send({
          topic: batchType,
          messages,
        });
      }

      console.log(`[KafkaWorker] Sent batch of ${messages.length} messages to topic ${batchType}`);
    } 
    else if (type === 'single' && eventType && payload) {
      // Handle single message (legacy support)
      const key = getPartitionKey(eventType, payload);
      const messages = [{ 
        key, 
        value: JSON.stringify(payload),
        timestamp: Date.now().toString()
      }];

      // Use transactional publishing for critical operations
      if (requiresTransaction(eventType)) {
        await sendTransactional(producer, eventType, messages);
      } else {
        await producer.send({
          topic: eventType,
          messages,
        });
      }

      console.log(`[KafkaWorker] Sent single message to topic ${eventType}`);
    } else {
      throw new Error('Invalid message format or missing required fields');
    }

    // Send success response
    const response: WorkerResponse = { correlationId, success: true };
    parentPort?.postMessage(response);

  } catch (err: any) {
    console.error(`[KafkaWorker] Failed to send messages:`, err);
    
    // Send error response
    const response: WorkerResponse = { 
      correlationId, 
      success: false, 
      error: err.message || 'Unknown error'
    };
    parentPort?.postMessage(response);
  }
}

/**
 * Initialize worker and set up message handling
 */
async function initializeWorker(): Promise<void> {
  try {
    // Initialize Kafka topics on worker startup
    await kafkaConnectionManager.initializeTopics();
    
    // Pre-connect the producer to avoid connection delays
    await kafkaConnectionManager.getProducer();
    
    console.log('[KafkaWorker] Worker initialized with centralized Kafka connection');
    
    // Set up message handler
    parentPort?.on('message', async (msg: WorkerMessage) => {
      await processMessage(msg);
    });

  } catch (error) {
    console.error('[KafkaWorker] Failed to initialize worker:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  console.log('[KafkaWorker] Shutting down worker...');
  try {
    // The connection manager will handle cleanup via its own shutdown handlers
    // We don't need to explicitly disconnect here as it's shared
    process.exit(0);
  } catch (error) {
    console.error('[KafkaWorker] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[KafkaWorker] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[KafkaWorker] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize the worker
initializeWorker().catch((error) => {
  console.error('[KafkaWorker] Failed to initialize:', error);
  process.exit(1);
});