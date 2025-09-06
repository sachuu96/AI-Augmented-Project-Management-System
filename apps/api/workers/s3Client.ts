import {
    S3Client,
    PutObjectCommand,
  } from "@aws-sdk/client-s3";

// MinIO (archive)
const s3 = new S3Client({
    region: "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minio",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minio123",
    },
  });

  export async function saveArchiveEvent(event: any) {
    try {
        await s3.send(
          new PutObjectCommand({
            Bucket: "event-archive",
            Key: `${event.type}/${Date.now()}.json`,
            Body: JSON.stringify(event),
          })
        );
      } catch (err) {
        console.error("❌ MinIO archive failed", err);
      }
  }

  