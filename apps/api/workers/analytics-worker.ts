import { Kafka, EachMessagePayload } from "kafkajs";
import { Worker } from "worker_threads";
import { saveEvent as saveEventToDynamo } from "./DynamoDBDocumentClient";
import { saveArchiveEvent } from "./s3Client";
import { KafkaBrokers, PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, LOW_STOCK_WARNING } from "../shared";


const kafka = new Kafka({
  clientId: process.env.KAFKA_ANALYSIS_SERVICE_CLIENT_ID || "analytics-service",
  brokers: KafkaBrokers,
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

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
  await consumer.connect();

  await consumer.subscribe({
    topics: [PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, LOW_STOCK_WARNING],
  });

  console.log("✅ Analytics service listening to events...");

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (!message.value) return;
      await handleEvent(topic, message.value.toString());
    },
  });
}
