import { Kafka } from "kafkajs";
import { pushEvent } from "../sse";

const kafka = new Kafka({
  clientId: "product-consumer",
  brokers: ["localhost:9092"], // same as in your publisher
});

const consumer = kafka.consumer({ groupId: "notifications-service" });

export async function startConsumer() {
  await consumer.connect();

  // Subscribe to all event topics
  await consumer.subscribe({ topic: "ProductCreated", fromBeginning: true });
  await consumer.subscribe({ topic: "ProductUpdated", fromBeginning: true });
  await consumer.subscribe({ topic: "ProductDeleted", fromBeginning: true });
  await consumer.subscribe({ topic: "LowStockWarning", fromBeginning: true });

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
