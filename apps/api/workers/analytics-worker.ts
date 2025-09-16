import { Kafka, EachMessagePayload } from "kafkajs";
import { Worker } from "worker_threads";
import { saveEvent as saveEventToDynamo } from "./DynamoDBDocumentClient";
import { saveArchiveEvent } from "./s3Client";
import { KafkaBrokers, PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, LOW_STOCK_WARNING } from "../shared";

// In-memory cache for deduplication (in production, use Redis)
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

function addToProcessedCache(messageId: string) {
  if (processedMessages.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (simple FIFO)
    const iterator = processedMessages.values();
    for (let i = 0; i < 1000; i++) {
      processedMessages.delete(iterator.next().value);
    }
  }
  processedMessages.add(messageId);
}

function isMessageProcessed(messageId: string): boolean {
  return processedMessages.has(messageId);
}


const kafka = new Kafka({
  clientId: process.env.KAFKA_ANALYSIS_SERVICE_CLIENT_ID || "analytics-service",
  brokers: KafkaBrokers,
});

const consumer = kafka.consumer({
  groupId: "analytics-group",
  minBytes: 1024, // fetch.min.bytes - minimum bytes to fetch
  maxWaitTimeInMs: 100, // fetch.max.wait.ms - max wait time for batching
  // Manual commits handled via commitOffsets
});

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
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, uncommittedOffsets }) => {
      const processedOffsets: { topic: string; partition: number; offset: string }[] = [];

      for (let message of batch.messages) {
        if (!message.value) continue;

        // Create unique message ID for deduplication
        const messageId = `${batch.topic}-${batch.partition}-${message.offset}`;

        // Skip if already processed
        if (isMessageProcessed(messageId)) {
          console.log(`Analytics: Skipping duplicate message: ${messageId}`);
          continue;
        }

        try {
          await handleEvent(batch.topic, message.value.toString());

          // Mark as processed
          addToProcessedCache(messageId);

          // Collect offset for manual commit
          processedOffsets.push({
            topic: batch.topic,
            partition: batch.partition,
            offset: message.offset
          });

          console.log(`Analytics: Processed message: ${messageId}`);
        } catch (err) {
          console.error(`Analytics: Failed to process message ${messageId}:`, err);
          // Don't include failed messages in commit
        }
      }

      // Manual acknowledgment: commit offsets for successfully processed messages
      if (processedOffsets.length > 0) {
        await consumer.commitOffsets(processedOffsets);
        console.log(`Analytics: Committed offsets for ${processedOffsets.length} messages`);
      }
    },
  });
}
