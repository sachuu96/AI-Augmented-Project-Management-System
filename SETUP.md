# AI-Augmented Project Management System

A scalable microservices-based project management system with real-time notifications and analytics capabilities.

## 🏗️ Architecture Overview

This system has been refactored into a microservices architecture for improved scalability and maintainability:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   API Service   │    │  Kafka Cluster  │
│   (Frontend)    │◄──►│   (Producer)    │───►│   (RedPanda)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │ Notifications   │◄───────────┤
                       │   Service       │            │
                       │ (Real-time SSE) │            │
                       └─────────────────┘            │
                                                      │
                       ┌─────────────────┐            │
                       │   Analytics     │◄───────────┘
                       │   Service       │
                       │ (Data Storage)  │
                       └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌───────▼────────┐
            │   DynamoDB     │  │   MinIO/S3     │
            │  (Real-time)   │  │   (Archive)    │
            └────────────────┘  └────────────────┘
```

## 🚀 Services

### 1. API Service (Producer)
- **Port**: 3000
- **Purpose**: REST API for product management and event publishing
- **Features**:
  - Product CRUD operations
  - Optimized Kafka producer with batching
  - Health checks and metrics endpoints
  - Database operations

### 2. Notifications Service
- **Port**: 3001
- **Purpose**: Real-time notifications via Server-Sent Events (SSE)
- **Features**:
  - Low-latency event consumption
  - SSE endpoint for real-time updates
  - WebSocket support (future)
  - Connection management

### 3. Analytics Service
- **Port**: 8080 (health endpoint)
- **Purpose**: Data processing and analytics
- **Features**:
  - Event storage in DynamoDB
  - Event archiving to S3/MinIO
  - Real-time aggregations
  - Metrics and analytics processing

### 4. Shared Package
- **Purpose**: Common types, constants, and utilities
- **Features**:
  - Event schemas and validation
  - Kafka configuration
  - TypeScript types
  - Batch processing utilities

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Message Broker**: Kafka (RedPanda)
- **Databases**: PostgreSQL, DynamoDB
- **Storage**: MinIO (S3-compatible)
- **Containerization**: Docker & Docker Compose
- **Frontend**: React + Vite

## 📦 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Start Infrastructure Services
```bash
# Start databases and message broker
docker-compose up postgres redpanda minio dynamodb dynamodb-admin -d
```

### 2. Install Dependencies
```bash
# Install shared package dependencies
cd packages/shared && npm install && npm run build

# Install API service dependencies
cd ../../apps/api && npm install

# Install Analytics service dependencies
cd ../analytics-service && npm install

# Install Notifications service dependencies
cd ../notifications-service && npm install

# Install Web client dependencies
cd ../web && npm install
```

### 3. Start All Services
```bash
# Start all services with Docker Compose
docker-compose up
```

Or start services individually for development:

```bash
# Terminal 1: API Service
cd apps/api && npm run dev

# Terminal 2: Analytics Service
cd apps/analytics-service && npm run dev

# Terminal 3: Notifications Service
cd apps/notifications-service && npm run dev

# Terminal 4: Web Client
cd apps/web && npm run dev
```

## 🔗 Service Endpoints

### API Service (Port 3000)
- `GET /products` - List products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /health` - Health check
- `GET /metrics` - Service metrics

### Notifications Service (Port 3001)
- `GET /events/stream` - SSE endpoint for real-time events
- `GET /health` - Health check
- `GET /metrics` - Service metrics

### Analytics Service (Port 8080)
- `GET /health` - Health check
- `GET /metrics` - Analytics metrics

### Web Client (Port 5173)
- React application with real-time updates

## 🔧 Configuration

### Environment Variables

#### API Service
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/app
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=api-service
LOW_STOCK_THRESHOLD=5
```

#### Analytics Service
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=analytics-service
DYNAMO_ENDPOINT=http://localhost:8000
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
RECENT_EVENTS_TABLE_NAME=RecentEvents
ARCHIVE_BUCKET_NAME=event-archive
```

#### Notifications Service
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notifications-service
PORT=3001
```

## 📊 Monitoring & Health Checks

Each service provides health check endpoints:

- **API Service**: `http://localhost:3000/health`
- **Analytics Service**: `http://localhost:8080/health`
- **Notifications Service**: `http://localhost:3001/health`

Metrics are available at `/metrics` endpoints for monitoring and scaling decisions.

## 🔄 Event Flow

1. **Product Operations**: API service receives REST requests
2. **Event Publishing**: API service publishes events to Kafka topics
3. **Real-time Notifications**: Notifications service consumes events and broadcasts via SSE
4. **Analytics Processing**: Analytics service consumes events for storage and processing
5. **Data Storage**: Events stored in DynamoDB and archived to S3/MinIO

## 📈 Scalability Benefits

### Independent Scaling
- **API Service**: Scale based on HTTP traffic
- **Notifications Service**: Scale based on concurrent SSE connections
- **Analytics Service**: Scale based on data processing requirements

### Resource Optimization
- Each service optimized for its specific workload
- Different instance types for different services
- Independent deployment and updates

### Fault Isolation
- Service failures don't cascade
- Better system resilience
- Graceful degradation

## 🧪 Testing

```bash
# Run tests for API service
cd apps/api && npm test

# Run tests for shared package
cd packages/shared && npm test
```

## 📝 Development

### Adding New Event Types
1. Update event schemas in `packages/shared/src/types.ts`
2. Add topic constants in `packages/shared/src/constants.ts`
3. Update consumers in respective services
4. Rebuild shared package: `cd packages/shared && npm run build`

### Service Communication
Services communicate primarily through Kafka events. Direct HTTP communication should be avoided to maintain loose coupling.

## 🚀 Deployment

The system is designed for containerized deployment with Docker. Each service can be deployed independently with proper environment configuration.

For production deployment:
1. Use managed Kafka service (AWS MSK, Confluent Cloud)
2. Use managed databases (RDS, DynamoDB)
3. Use container orchestration (Kubernetes, ECS)
4. Implement proper monitoring and logging

## 📚 Additional Documentation

- [API Service Documentation](apps/api/README.md)
- [Analytics Service Documentation](apps/analytics-service/README.md)
- [Notifications Service Documentation](apps/notifications-service/README.md)
- [Architecture Decision Records](docs/architecture/)