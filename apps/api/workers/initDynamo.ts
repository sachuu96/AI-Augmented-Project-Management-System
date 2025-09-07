import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "eu-west-1",
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
  },
});

const TABLE_NAME = process.env.RECENT_EVENTS_TABLE_NAME || "RecentEvents";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensure DynamoDB "RecentEvents" table exists.
 * Retries on connection errors or ResourceNotFound.
 */
export async function ensureRecentEventsTable(maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`✅ DynamoDB table "${TABLE_NAME}" already exists`);
      return;
    } catch (err: any) {
      if (err.name === "ResourceNotFoundException") {
        console.log(`⚡ Creating DynamoDB table "${TABLE_NAME}"...`);
        await client.send(
          new CreateTableCommand({
            TableName: TABLE_NAME,
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
              { AttributeName: "id", AttributeType: "S" },
              { AttributeName: "ts", AttributeType: "S" },
            ],
            KeySchema: [
              { AttributeName: "id", KeyType: "HASH" }, // Partition key
              { AttributeName: "ts", KeyType: "RANGE" }, // Sort key
            ],
          })
        );
        console.log(`✅ DynamoDB table "${TABLE_NAME}" created`);
        return;
      }

      // Likely connection refused or Dynamo not ready
      console.warn(
        `⚠️ DynamoDB not ready (attempt ${attempt}/${maxRetries}): ${err.message}`
      );
      if (attempt < maxRetries) {
        const delay = 2000 * attempt; // exponential backoff
        await sleep(delay);
        continue;
      } else {
        console.error("❌ DynamoDB table init failed after retries", err);
        throw err;
      }
    }
  }
}

  