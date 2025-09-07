import { Kafka } from "kafkajs";
import { pushEvent } from "../sse";
import { KafkaBrokers } from '../../shared';
import { PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../../shared';


const kafka = new Kafka({
  clientId: process.env.KAFKA_PRODUCT_CONSUMER_CLIENT_ID || "product-consumer",
  brokers: KafkaBrokers,
});

const consumer = kafka.consumer({ groupId: "notifications-service" });

export async function startConsumer() {
  await consumer.connect();

  // Subscribe to all event topics
  await consumer.subscribe({ topic: PRODUCT_CREATED, fromBeginning: true });
  await consumer.subscribe({ topic: PRODUCT_UPDATED, fromBeginning: true });
  await consumer.subscribe({ topic: PRODUCT_DELETED, fromBeginning: true });
  await consumer.subscribe({ topic: LOW_STOCK_WARNING, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || "{}");
        event.type = topic; // ensure we have the event type
        pushEvent(event);
      } catch (err) {
        console.error("Failed to process Kafka message", err);
      }
    },
  });
}
