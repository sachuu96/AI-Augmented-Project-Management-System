# Analytics Service

The Analytics Service is responsible for consuming events from Kafka, processing them for analytics, and storing them in both real-time and archival storage systems.

## 🎯 Purpose

- **Event Processing**: Consumes all product-related events from Kafka
- **Real-time Storage**: Stores events in DynamoDB for fast access
- **Archival Storage**: Archives events to S3/MinIO for long-term retention
- **Aggregations**: Processes events to generate real-time metrics and aggregations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Kafka Topics   │───►│ Analytics       │───►│   DynamoDB      │
│                 │    │ Consumer        │    │ (Real-time)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Aggregator      │
                       │ Worker Thread   │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MinIO/S3      │
                       │   (Archive)     │
                       └─────────────────┘
```

## 🚀 Features

### Event Processing Pipeline
1. **Kafka Consumer**: Optimized for high-throughput batch processing
2. **Event Validation**: Schema validation using Zod
3. **Parallel Processing**: DynamoDB storage, S3 archival, and aggregations run in parallel
4. **Deduplication**: Prevents duplicate event processing
5. **Error Handling**: Robust error handling with retry logic

### Storage Systems
- **DynamoDB**: Real-time event storage with TTL (30 days)
- **S3/MinIO**: Long-term archival with hierarchical partitioning
- **In-Memory Aggregations**: Real-time metrics and statistics

### Worker Threads
- **Aggregator Worker**: Processes events for real-time analytics
- **Background Processing**: Non-blocking aggregation calculations

## 📊 Metrics & Monitoring

### Health Check Endpoint
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "kafka": { "status": "healthy" },
    "dynamodb": { "status": "healthy" },
    "s3": { "status": "healthy" }
  },
  "metrics": {
    "totalEvents": 1000,
    "eventsByType": {
      "ProductCreated": 250,
      "ProductUpdated": 500,
      "ProductDeleted": 50,
      "LowStockWarning": 200
    }
  }
}
```

### Metrics Endpoint
```
GET /metrics
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `analytics-service` |
| `DYNAMO_ENDPOINT` | DynamoDB endpoint URL | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | `fake` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `fake` |
| `RECENT_EVENTS_TABLE_NAME` | DynamoDB table name | `RecentEvents` |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | - |
| `MINIO_ACCESS_KEY` | MinIO access key | `minio` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minio123` |
| `ARCHIVE_BUCKET_NAME` | S3 bucket for archives | `event-archive` |
| `HEALTH_PORT` | Health check server port | `8080` |

### Kafka Consumer Configuration

The service uses optimized consumer settings for analytics workloads:

- **Group ID**: `analytics-group`
- **Batch Processing**: Enabled for high throughput
- **Session Timeout**: 30 seconds
- **Heartbeat Interval**: 3 seconds
- **Rebalance Timeout**: 60 seconds (allows time for complex processing)

## 🗄️ Data Storage

### DynamoDB Schema
```typescript
{
  id: string,           // Unique event ID
  eventId: string,      // Original event ID
  eventType: string,    // Event type (ProductCreated, etc.)
  timestamp: string,    // Event timestamp
  data: Event,          // Full event data
  ttl: number,          // TTL for automatic cleanup (30 days)
  createdAt: string     // Processing timestamp
}
```

### S3 Archive Structure
```
event-archive/
├── events/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 15/
│   │   │   │   ├── 10/
│   │   │   │   │   ├── event-id-1.json
│   │   │   │   │   └── event-id-2.json
```

## 🔄 Event Processing Flow

1. **Event Consumption**: Batch consumption from Kafka topics
2. **Validation**: Schema validation using shared event types
3. **Parallel Processing**:
   - Store in DynamoDB for real-time access
   - Archive to S3 for long-term retention
   - Send to aggregator worker for metrics
4. **Offset Management**: Manual offset commits after successful processing
5. **Error Handling**: Failed messages are retried, successful ones are committed

## 🧵 Worker Threads

### Aggregator Worker
- **Purpose**: Real-time metric calculations
- **Processing**: Event counting, hourly statistics, product status tracking
- **Communication**: Message passing with main thread
- **Data**: In-memory aggregations with periodic cleanup

### Aggregation Metrics
- Total events processed
- Events by type
- Hourly event statistics
- Product status counters
- Processing performance metrics

## 🚀 Development

### Local Development
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

### Testing
```bash
# Run tests
npm test
```

## 🐳 Docker

### Build Image
```bash
docker build -t analytics-service .
```

### Run Container
```bash
docker run -p 8080:8080 \
  -e KAFKA_BROKERS=localhost:9092 \
  -e DYNAMO_ENDPOINT=http://localhost:8000 \
  -e MINIO_ENDPOINT=http://localhost:9000 \
  analytics-service
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Multiple instances can run with the same consumer group
- Kafka partitions enable parallel processing
- Each instance processes different partitions

### Performance Tuning
- Adjust batch sizes for throughput vs. latency
- Configure worker thread pool sizes
- Optimize DynamoDB and S3 write patterns

### Resource Requirements
- **CPU**: Moderate (data processing and aggregations)
- **Memory**: Moderate (in-memory aggregations and batching)
- **Network**: High (Kafka consumption and storage writes)
- **Storage**: Low (temporary processing only)

## 🔍 Troubleshooting

### Common Issues

1. **Kafka Connection Failures**
   - Check `KAFKA_BROKERS` configuration
   - Verify network connectivity
   - Check Kafka cluster health

2. **DynamoDB Errors**
   - Verify `DYNAMO_ENDPOINT` and credentials
   - Check table existence and permissions
   - Monitor throttling and capacity

3. **S3/MinIO Issues**
   - Verify endpoint and credentials
   - Check bucket existence and permissions
   - Monitor storage capacity

### Monitoring
- Monitor consumer lag for processing delays
- Track error rates and failed message counts
- Monitor storage system health and capacity
- Watch aggregation worker performance

## 🔗 Dependencies

- **@project/shared**: Shared types and utilities
- **kafkajs**: Kafka client library
- **@aws-sdk/client-dynamodb**: DynamoDB client
- **@aws-sdk/client-s3**: S3 client
- **uuid**: Unique ID generation
- **dotenv**: Environment configuration

## 📝 API Reference

### Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Service health status
- **Response**: Health status with service checks

### Metrics
- **Endpoint**: `GET /metrics`
- **Purpose**: Service and processing metrics
- **Response**: Detailed metrics and statistics