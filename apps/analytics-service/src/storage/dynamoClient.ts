import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Event } from '@project/shared';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMO_ENDPOINT || undefined,
  credentials: process.env.DYNAMO_ENDPOINT ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
  } : undefined,
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * Save event to DynamoDB for analytics processing
 */
export async function saveEvent(event: Event): Promise<void> {
  const tableName = process.env.RECENT_EVENTS_TABLE_NAME || "RecentEvents";
  
  try {
    const item = {
      id: uuidv4(),
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp,
      data: event,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await docClient.send(command);
    console.log(`[DynamoClient] Saved event ${event.id} to DynamoDB`);
  } catch (error) {
    console.error(`[DynamoClient] Failed to save event ${event.id}:`, error);
    throw error;
  }
}

/**
 * Health check for DynamoDB connection
 */
export async function healthCheck(): Promise<{ status: string; error?: string }> {
  try {
    // Simple health check - try to describe the table
    const tableName = process.env.RECENT_EVENTS_TABLE_NAME || "RecentEvents";
    
    // For local DynamoDB, we'll just try a simple operation
    const testItem = {
      id: "health-check",
      eventType: "HealthCheck",
      timestamp: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 60, // 1 minute TTL
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: testItem,
    });

    await docClient.send(command);
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { docClient };