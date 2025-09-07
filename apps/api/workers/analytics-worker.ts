import { Kafka, EachMessagePayload } from "kafkajs";
import { saveEvent as saveEventToDynamo} from './DynamoDBDocumentClient';
import { saveArchiveEvent } from './s3Client';
import { KafkaBrokers } from '../shared';

import { PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED, LOW_STOCK_WARNING } from '../shared';

// Event shape
interface EventMessage {
  type: typeof PRODUCT_CREATED | typeof PRODUCT_DELETED | typeof PRODUCT_UPDATED | typeof LOW_STOCK_WARNING;
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
  brokers: KafkaBrokers,
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

// In-memory aggregates
const aggregates: Aggregates = {
  perCategory: {},
  lowStockCount: 0,
};

function updateAggregates(event: EventMessage) {
  switch (event.type) {
    case PRODUCT_CREATED:
      if (event.payload?.category) {
        aggregates.perCategory[event.payload.category] =
          (aggregates.perCategory[event.payload.category] || 0) + 1;
      }
      break;

    case PRODUCT_DELETED:
      if (event.payload?.category) {
        aggregates.perCategory[event.payload.category] =
          Math.max(
            0,
            (aggregates.perCategory[event.payload.category] || 1) - 1
          );
      }
      break;

    case LOW_STOCK_WARNING:
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