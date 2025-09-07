import { parentPort } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { KafkaBrokers } from '../../shared';

const kafka = new Kafka({
  clientId: process.env.KAFKA_PRODUCT_PUBLISH_CLIENT_ID || 'product-service',
  brokers: KafkaBrokers,
});

const producer = kafka.producer();

// A promise that resolves once producer.connect() finishes
let ready: Promise<void>;

async function init() {
  ready = producer.connect();
  await ready;
  console.log('[Kafka] Producer connected');
}

parentPort?.on('message', async (msg) => {
  await ready; // ensure connection is ready before sending

  const { correlationId, type, payload } = msg;

  try {
    await producer.send({
      topic: type,
      messages: [{ value: JSON.stringify(payload) }],
    });

    parentPort?.postMessage({ correlationId, success: true });
  } catch (err: any) {
    parentPort?.postMessage({ correlationId, success: false, error: err.message });
  }
});

// Initialize producer connection once when worker starts
init().catch((err) => {
  console.error('[Kafka] Failed to connect producer', err);
  process.exit(1);
});

