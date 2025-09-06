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
  
  const TABLE_NAME = "RecentEvents";
  
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
              { AttributeName: "id", KeyType: "HASH" }, // Partition key
              { AttributeName: "ts", KeyType: "RANGE" }, // Sort key
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
  