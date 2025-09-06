import { Kafka, EachMessagePayload } from "kafkajs";
import { saveEvent as saveEventToDynamo} from './DynamoDBDocumentClient';
import { saveArchiveEvent } from './s3Client';
// import { ProductCreated, ProductDeleted, ProductUpdated, LawStockWarning } from '../../../../packages/event-schemas/types';

// Event shape
interface EventMessage {
  type: "ProductCreated" | "ProductUpdated" | "ProductDeleted" | "LowStockWarning";
  payload: Record<string, any>;
  ts?: string;
}

// Aggregates shape
interface Aggregates {
  perCategory: Record<string, number>;
  lowStockCount: number;
}

const kafka = new Kafka({
  clientId: process.env.KAFKA_ANALYSIS_SERVICE_CLIENT_ID || "analytics-service",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

// In-memory aggregates
const aggregates: Aggregates = {
  perCategory: {},
  lowStockCount: 0,
};

function updateAggregates(event: EventMessage) {
  switch (event.type) {
    case "ProductCreated":
      if (event.payload?.category) {
        aggregates.perCategory[event.payload.category] =
          (aggregates.perCategory[event.payload.category] || 0) + 1;
      }
      break;

    case "ProductDeleted":
      if (event.payload?.category) {
        aggregates.perCategory[event.payload.category] =
          Math.max(
            0,
            (aggregates.perCategory[event.payload.category] || 1) - 1
          );
      }
      break;

    case "LowStockWarning":
      aggregates.lowStockCount++;
      break;
  }

  console.log("📈 Aggregates updated:", aggregates);
}

async function handleEvent(topic: string, rawMessage: string) {
  const event: EventMessage = JSON.parse(rawMessage);

  event.ts = new Date().toISOString();

  console.log(`📊 Analytics got event ${topic}`, event);

  // 1) Save to DynamoDB
  await saveEventToDynamo(event);

  // 2) Archive to MinIO/S3
  await saveArchiveEvent(event);

  // 3) Update aggregates
  updateAggregates(event);
}

export async function runAnalyticsWorker() {
    await consumer.connect();
  
    await consumer.subscribe({
      topics: ["ProductCreated", "ProductUpdated", "ProductDeleted", "LowStockWarning"],
    });
  
    console.log("✅ Analytics service listening to events...");
  
    await consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        await handleEvent(topic, message.value.toString());
      },
    });
  }