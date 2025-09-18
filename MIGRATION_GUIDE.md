# Migration Guide: Monolithic to Microservices Architecture

This guide explains the migration from the original monolithic architecture to the new microservices-based system.

## 🔄 Architecture Changes

### Before: Monolithic Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    API Service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Product   │  │   Event     │  │   Analytics     │  │
│  │     API     │  │  Publisher  │  │   Consumer      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │     SSE     │  │ Notifications│  │   DynamoDB      │  │
│  │   Handler   │  │  Consumer   │  │   Operations    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### After: Microservices Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Service   │    │ Notifications   │    │   Analytics     │
│   (Producer)    │    │   Service       │    │   Service       │
│                 │    │                 │    │                 │
│ • Product API   │    │ • SSE Handler   │    │ • Event Storage │
│ • Event Publish │    │ • Real-time     │    │ • Aggregations  │
│ • Database Ops  │    │   Broadcasting  │    │ • Archival      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Kafka Cluster  │
                    │   (RedPanda)    │
                    └─────────────────┘
```

## 📋 Migration Steps

### Step 1: Backup Current System
```bash
# Backup database
pg_dump -h localhost -U postgres app > backup_$(date +%Y%m%d).sql

# Backup configuration
cp -r apps/api/.env apps/api/.env.backup
```

### Step 2: Install New Dependencies
```bash
# Install shared package dependencies
cd packages/shared
npm install
npm run build

# Install new service dependencies
cd ../../apps/analytics-service
npm install

cd ../notifications-service
npm install

# Update API service dependencies
cd ../api
npm install
```

### Step 3: Update Environment Configuration

#### API Service (.env)
```env
# Remove consumer-related variables
# ENABLE_ANALYTICS=true  # Remove this
# KAFKA_ANALYSIS_SERVICE_CLIENT_ID=analytics-service  # Remove this

# Keep producer-related variables
DATABASE_URL=postgresql://postgres:password@localhost:5432/app
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=api-service
KAFKA_TRANSACTIONAL_ID=api-service-transaction
LOW_STOCK_THRESHOLD=5
```

#### Analytics Service (.env)
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=analytics-service
DYNAMO_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=fake
AWS_SECRET_ACCESS_KEY=fake
RECENT_EVENTS_TABLE_NAME=RecentEvents
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
ARCHIVE_BUCKET_NAME=event-archive
HEALTH_PORT=8080
```

#### Notifications Service (.env)
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notifications-service
PORT=3001
```

### Step 4: Update Frontend Configuration

Update the SSE endpoint in your frontend configuration:

```javascript
// Before
const SSE_URL = 'http://localhost:3000/events/stream';

// After
const SSE_URL = 'http://localhost:3001/events/stream';
```

### Step 5: Start Services in Order

```bash
# 1. Start infrastructure
docker-compose up postgres redpanda minio dynamodb -d

# 2. Start API service (producer)
cd apps/api
npm run dev

# 3. Start analytics service
cd ../analytics-service
npm run dev

# 4. Start notifications service
cd ../notifications-service
npm run dev

# 5. Start frontend
cd ../web
npm run dev
```

## 🔧 Code Changes Required

### Removed Files from API Service
The following files are no longer needed in the API service:
- `src/events/consumer.ts` - Moved to notifications service
- `workers/analytics-worker.ts` - Moved to analytics service
- `workers/aggregatorWorker.ts` - Moved to analytics service
- `workers/DynamoDBDocumentClient.ts` - Moved to analytics service
- `workers/s3Client.ts` - Moved to analytics service
- `src/sse.ts` - Moved to notifications service

### Updated Files in API Service
- `src/index.ts` - Removed consumer startup code
- `src/kafka/connectionManager.ts` - Producer-only functionality
- `src/events/publisher.ts` - Updated to use shared package
- `package.json` - Added shared package dependency

### New Service Structure
```
apps/
├── api/                    # Producer service
├── analytics-service/      # Analytics consumer
├── notifications-service/  # Notifications consumer
└── web/                   # Frontend (updated SSE URL)

packages/
└── shared/                # Common types and utilities
```

## 🚨 Breaking Changes

### 1. SSE Endpoint Change
- **Before**: `http://localhost:3000/events/stream`
- **After**: `http://localhost:3001/events/stream`

### 2. Health Check Endpoints
- **API Service**: `http://localhost:3000/health` (producer health)
- **Analytics Service**: `http://localhost:8080/health` (analytics health)
- **Notifications Service**: `http://localhost:3001/health` (notifications health)

### 3. Metrics Endpoints
Each service now has its own metrics endpoint with service-specific metrics.

### 4. Environment Variables
Consumer-related environment variables moved to respective services.

## 🔍 Verification Steps

### 1. Verify API Service (Producer)
```bash
# Test product creation
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99,"stock":10,"sellerId":"seller1"}'

# Check health
curl http://localhost:3000/health
```

### 2. Verify Notifications Service
```bash
# Test SSE connection
curl -N -H "Accept: text/event-stream" http://localhost:3001/events/stream

# Check health
curl http://localhost:3001/health
```

### 3. Verify Analytics Service
```bash
# Check health
curl http://localhost:8080/health

# Check metrics
curl http://localhost:8080/metrics
```

### 4. Verify End-to-End Flow
1. Create a product via API
2. Verify real-time notification in frontend
3. Check analytics service processed the event
4. Verify data stored in DynamoDB and S3

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot find module '@project/shared'"
```bash
# Solution: Build the shared package
cd packages/shared
npm run build
```

#### 2. SSE Connection Fails
- Check if notifications service is running on port 3001
- Verify frontend is pointing to correct SSE URL
- Check CORS configuration

#### 3. Events Not Being Processed
- Verify Kafka is running and accessible
- Check consumer group assignments
- Monitor Kafka topics for messages

#### 4. Analytics Data Missing
- Check DynamoDB and MinIO connectivity
- Verify AWS credentials (even fake ones for local)
- Check analytics service logs

### Service Startup Order
1. Infrastructure services (Postgres, Kafka, DynamoDB, MinIO)
2. API service (creates topics)
3. Consumer services (analytics, notifications)
4. Frontend

### Monitoring Commands
```bash
# Check Kafka topics
docker exec redpanda rpk topic list

# Check consumer groups
docker exec redpanda rpk group list

# Check DynamoDB tables
curl http://localhost:8001  # DynamoDB Admin UI

# Check MinIO buckets
curl http://localhost:9001  # MinIO Console
```

## 📊 Performance Comparison

### Before (Monolithic)
- **Single Point of Failure**: All functionality in one service
- **Resource Contention**: Producer and consumers compete for resources
- **Scaling Limitations**: Cannot scale components independently

### After (Microservices)
- **Independent Scaling**: Scale each service based on its workload
- **Fault Isolation**: Service failures don't cascade
- **Resource Optimization**: Each service optimized for its specific needs
- **Technology Flexibility**: Different services can use different technologies

### Expected Improvements
- **Latency**: Notifications service optimized for low latency
- **Throughput**: Analytics service optimized for high throughput
- **Reliability**: Better fault tolerance and recovery
- **Maintainability**: Smaller, focused codebases

## 🔄 Rollback Plan

If issues arise, you can rollback to the monolithic architecture:

```bash
# 1. Stop new services
# Stop analytics and notifications services

# 2. Restore API service
git checkout <previous-commit>  # Before microservices changes
cd apps/api
npm install
npm run dev

# 3. Update frontend SSE URL back to port 3000
# Update frontend configuration

# 4. Restart with original docker-compose
docker-compose down
docker-compose up
```

## 📈 Next Steps

After successful migration:

1. **Monitoring**: Set up proper monitoring and alerting
2. **Logging**: Implement centralized logging
3. **Scaling**: Configure auto-scaling based on metrics
4. **Security**: Implement proper authentication and authorization
5. **Testing**: Add integration tests for service communication
6. **Documentation**: Update API documentation
7. **Deployment**: Set up CI/CD pipelines for each service

## 🎯 Success Criteria

Migration is successful when:
- ✅ All services start without errors
- ✅ Product CRUD operations work via API
- ✅ Real-time notifications work in frontend
- ✅ Events are stored in DynamoDB and S3
- ✅ Health checks pass for all services
- ✅ No data loss during migration
- ✅ Performance is equal or better than before

## 📞 Support

If you encounter issues during migration:
1. Check service logs for error messages
2. Verify environment configuration
3. Test each service independently
4. Check network connectivity between services
5. Refer to individual service README files for detailed troubleshooting