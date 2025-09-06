import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: "eu-west-1",
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
  },
}));

export async function saveEvent(event: any) {
  try {
    await ddb.send(
      new PutCommand({
        TableName: "RecentEvents",
        Item: {
          id: `${event.type}-${Date.now()}`,
          type: event.type,
          payload: event.payload,
          ts: event.ts || new Date().toISOString(),
        },
      })
    );
    console.log("✅ Event saved:", event.type);
  } catch (err) {
    console.error("❌ DynamoDB write failed", err);
  }
}
