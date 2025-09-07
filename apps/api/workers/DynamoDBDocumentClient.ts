import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";


const client = new DynamoDBClient({
  region: "eu-west-1",
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
  },
});

const ddbDoc = DynamoDBDocumentClient.from(client);

/**
 * Save an event into DynamoDB using PutItemCommand.
 */
export async function saveEvent(event: {
  type: string;
  payload: any;
  ts?: string;
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

