import { parentPort } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { KafkaBrokers, PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../../shared';

const kafka = new Kafka({
  clientId: process.env.KAFKA_PRODUCT_PUBLISH_CLIENT_ID || 'product-service',
  brokers: KafkaBrokers,
});

const producer = kafka.producer({
  idempotent: true, // Enable idempotent producer for exactly-once delivery
  transactionalId: process.env.KAFKA_TRANSACTIONAL_ID || 'product-service-transaction',
  maxInFlightRequests: 1, // Required for idempotence
});
const admin = kafka.admin();

// A promise that resolves once producer.connect() finishes
let ready: Promise<void>;

async function init() {
  ready = producer.connect();
  await ready;
  console.log('[Kafka] Producer connected with idempotence enabled');

  // Create topics with partitions
  await admin.connect();
  const partitionCount = parseInt(process.env.KAFKA_TOPIC_PARTITIONS || '3');
  const topics = [
    { topic: PRODUCT_CREATED, numPartitions: partitionCount },
    { topic: PRODUCT_UPDATED, numPartitions: partitionCount },
    { topic: PRODUCT_DELETED, numPartitions: partitionCount },
    { topic: LOW_STOCK_WARNING, numPartitions: partitionCount },
  ];

  await admin.createTopics({ topics, waitForLeaders: true });
  console.log(`[Kafka] Created topics with ${partitionCount} partitions`);
  await admin.disconnect();
}

function getPartitionKey(type: string, payload: any): string {
  switch (type) {
    case 'ProductCreated':
    case 'ProductUpdated':
      return payload.product.id;
    case 'ProductDeleted':
    case 'LowStockWarning':
      return payload.productId;
    default:
      return 'default';
  }
}

async function sendTransactional(topic: string, messages: any[]) {
  const transaction = await producer.transaction();
  try {
    await transaction.send({ topic, messages });
    await transaction.commit();
  } catch (err) {
    await transaction.abort();
    throw err;
  }
}

parentPort?.on('message', async (msg) => {
  await ready; // ensure connection is ready before sending

  const { correlationId, type, payload, batchType, events } = msg;

  try {
    // Handle batch processing
    if (type === 'batch' && events && Array.isArray(events)) {
      const messages = events.map(event => ({
        key: getPartitionKey(event.type, event.payload),
        value: JSON.stringify(event.payload)
      }));

      // Use transactional publishing for critical operations
      if (batchType === 'ProductCreated' || batchType === 'ProductDeleted') {
        await sendTransactional(batchType, messages);
      } else {
        await producer.send({
          topic: batchType,
          messages,
        });
      }

      console.log(`[Worker] Sent batch of ${messages.length} messages to topic ${batchType}`);
    }
    // Handle single message (legacy support)
    else {
      const key = getPartitionKey(type, payload);
      const messages = [{ key, value: JSON.stringify(payload) }];

      // Use transactional publishing for critical operations
      if (type === 'ProductCreated' || type === 'ProductDeleted') {
        await sendTransactional(type, messages);
      } else {
        await producer.send({
          topic: type,
          messages,
        });
      }

      console.log(`[Worker] Sent single message to topic ${type}`);
    }

    parentPort?.postMessage({ correlationId, success: true });
  } catch (err: any) {
    console.error(`[Worker] Failed to send messages:`, err);
    parentPort?.postMessage({ correlationId, success: false, error: err.message });
  }
});

// Initialize producer connection once when worker starts
init().catch((err) => {
  console.error('[Kafka] Failed to connect producer', err);
  process.exit(1);
});

