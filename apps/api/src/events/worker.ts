import { parentPort, workerData } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { KafkaBrokers } from '../../shared';

const kafka = new Kafka({
  clientId: process.env.KAFKA_PRODUCT_PUBLISH_CLIENT_ID || 'product-service',
  brokers: KafkaBrokers
});

const producer = kafka.producer();

const publish = async () => {
  const { type, payload } = workerData;

  await producer.connect();

  await producer.send({
    topic: type, // use event type as topic name
    messages: [
      { value: JSON.stringify(payload) }
    ]
  });

  await producer.disconnect();

  parentPort?.postMessage({ success: true });
};

publish().catch((err) => {
  parentPort?.postMessage({ success: false, error: err.message });
});
