import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Event } from '@project/shared';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.MINIO_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "minio",
    secretAccessKey: process.env.MINIO_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "minio123",
  },
  forcePathStyle: true, // Required for MinIO
});

/**
 * Archive event to S3/MinIO for long-term storage
 */
export async function saveArchiveEvent(event: Event): Promise<void> {
  const bucketName = process.env.ARCHIVE_BUCKET_NAME || "event-archive";
  
  try {
    // Create a hierarchical key structure: year/month/day/hour/eventId.json
    const date = new Date(event.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    
    const key = `events/${year}/${month}/${day}/${hour}/${event.id}.json`;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(event, null, 2),
      ContentType: "application/json",
      Metadata: {
        eventType: event.type,
        timestamp: event.timestamp,
        eventId: event.id,
      },
    });

    await s3Client.send(command);
    console.log(`[S3Client] Archived event ${event.id} to S3 at ${key}`);
  } catch (error) {
    console.error(`[S3Client] Failed to archive event ${event.id}:`, error);
    throw error;
  }
}

/**
 * Health check for S3 connection
 */
export async function healthCheck(): Promise<{ status: string; error?: string }> {
  try {
    const bucketName = process.env.ARCHIVE_BUCKET_NAME || "event-archive";
    
    // Try to put a small health check object
    const testKey = `health-check/${Date.now()}.json`;
    const testData = {
      type: "HealthCheck",
      timestamp: new Date().toISOString(),
      service: "analytics-service"
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: JSON.stringify(testData),
      ContentType: "application/json",
    });

    await s3Client.send(command);
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { s3Client };