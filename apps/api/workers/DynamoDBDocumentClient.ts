// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
//   region: "eu-west-1",
//   endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
//   },
// }));

// export async function saveEvent(event: any) {
//   try {
//     await ddb.send(
//       new PutCommand({
//         TableName: "RecentEvents",
//         Item: {
//           id: `${event.type}-${Date.now()}`,
//           type: event.type,
//           payload: event.payload,
//           ts: event.ts || new Date().toISOString(),
//         },
//       })
//     );
//     console.log("✅ Event saved:", event.type);
//   } catch (err) {
//     console.error("❌ DynamoDB write failed", err);
//   }
// }

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// import {
//   DynamoDBClient,
//   PutItemCommand,
//   CreateTableCommand,
//   DescribeTableCommand,
// } from "@aws-sdk/client-dynamodb";

// const client = new DynamoDBClient({ region: "eu-west-1" });

const client = new DynamoDBClient({
  region: "eu-west-1",
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
  },
});

const ddbDoc = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "RecentEvents";

/**
 * Ensure DynamoDB table exists, otherwise create it.
 */
export async function ensureRecentEventsTable() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`✅ DynamoDB table "${TABLE_NAME}" already exists`);
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
            { AttributeName: "id", KeyType: "HASH" },
            { AttributeName: "ts", KeyType: "RANGE" },
          ],
        })
      );
      console.log(`✅ DynamoDB table "${TABLE_NAME}" created`);
    } else {
      console.error("❌ DynamoDB error", err);
      throw err;
    }
  }
}

/**
 * Save an event into DynamoDB using PutItemCommand.
 */
export async function saveEvent(event: {
  type: string;
  payload: any;
  ts: string;
}) {
  try {
    await ddbDoc.send(
      new PutCommand({
        TableName: "RecentEvents",
        Item: {
          id: "123",
          ts: new Date().toISOString(),
          type: "ProductCreated",
          payload: { foo: "bar" },
        },
      })
    );
    console.log(`✅ Event ${event.type} saved to DynamoDB`);
  } catch (err) {
    console.error("❌ DynamoDB write failed", err);
  }
}

