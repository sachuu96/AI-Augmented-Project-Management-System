# Notifications Service

The Notifications Service provides real-time event streaming to web clients using Server-Sent Events (SSE). It's optimized for low-latency delivery of product events to connected users.

## 🎯 Purpose

- **Real-time Notifications**: Streams events to web clients via SSE
- **Low Latency**: Optimized for immediate event delivery
- **Connection Management**: Handles multiple concurrent SSE connections
- **Event Broadcasting**: Distributes events to all connected clients

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Kafka Topics   │───►│ Notifications   │───►│   Web Clients   │
│                 │    │ Consumer        │    │   (SSE/WS)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ SSE Connection  │
                       │ Manager         │
                       └─────────────────┘
```

## 🚀 Features

### Real-time Event Streaming
- **Server-Sent Events (SSE)**: HTTP-based real-time communication
- **Connection Management**: Automatic connection lifecycle handling
- **Heartbeat**: Keep-alive mechanism for stable connections
- **Graceful Disconnection**: Clean connection termination

### Event Processing
- **Low-latency Consumer**: Optimized for immediate processing
- **Event Broadcasting**: Simultaneous delivery to all clients
- **Deduplication**: Prevents duplicate event delivery
- **Error Resilience**: Continues processing despite individual failures

### Connection Features
- **Auto-reconnection**: Client-side reconnection support
- **Connection Statistics**: Real-time connection metrics
- **CORS Support**: Cross-origin resource sharing enabled

## 📡 SSE Endpoint

### Connection
```
GET /events/stream
```

### Event Format
```javascript
// Connection established
data: {
  "type": "connection",
  "message": "Connected to notifications stream",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Product event
data: {
  "id": "event-123",
  "type": "ProductCreated",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "product": {
    "id": "prod-456",
    "name": "New Product",
    "price": 99.99,
    "stock": 100
  },
  "broadcastTimestamp": "2024-01-01T00:00:00.001Z"
}

// Heartbeat
data: {
  "type": "heartbeat",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Client Usage
```javascript
const eventSource = new EventSource('http://localhost:3001/events/stream');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'connection':
      console.log('Connected to notifications');
      break;
    case 'ProductCreated':
    case 'ProductUpdated':
    case 'ProductDeleted':
    case 'LowStockWarning':
      // Handle product events
      updateUI(data);
      break;
    case 'heartbeat':
      // Connection is alive
      break;
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
};
```

## 📊 Monitoring & Health

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
    "kafka": { "status": "healthy" }
  },
  "metrics": {
    "processedMessagesCount": 1000,
    "maxCacheSize": 10000
  },
  "sse": {
    "activeConnections": 25,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Metrics Endpoint
```
GET /metrics
```

Response:
```json
{
  "consumer": {
    "processedMessagesCount": 1000,
    "maxCacheSize": 10000,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "sse": {
    "activeConnections": 25,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `notifications-service` |
| `PORT` | HTTP server port | `3001` |

### Kafka Consumer Configuration

Optimized for low-latency real-time processing:

- **Group ID**: `notifications-service`
- **Min Bytes**: 1 (process immediately)
- **Max Wait Time**: 50ms (very low latency)
- **Auto Commit**: Enabled for faster processing
- **Auto Commit Interval**: 1 second

## 🔄 Event Processing Flow

1. **Event Consumption**: Individual message processing for low latency
2. **Validation**: Schema validation using shared event types
3. **Deduplication**: Skip already processed messages
4. **Broadcasting**: Send to all active SSE connections
5. **Connection Cleanup**: Remove dead connections automatically

## 📡 SSE Connection Management

### Connection Lifecycle
1. **Establishment**: Client connects to `/events/stream`
2. **Registration**: Connection added to active connections set
3. **Heartbeat**: Periodic keep-alive messages (30s interval)
4. **Event Delivery**: Real-time event broadcasting
5. **Cleanup**: Automatic removal on disconnect/error

### Connection Statistics
- **Active Connections**: Current number of connected clients
- **Connection Events**: Track connects/disconnects
- **Broadcast Statistics**: Events sent per connection
- **Error Tracking**: Failed delivery attempts

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

### Testing SSE Connection
```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" http://localhost:3001/events/stream

# Test health endpoint
curl http://localhost:3001/health

# Test metrics endpoint
curl http://localhost:3001/metrics
```

## 🐳 Docker

### Build Image
```bash
docker build -t notifications-service .
```

### Run Container
```bash
docker run -p 3001:3001 \
  -e KAFKA_BROKERS=localhost:9092 \
  notifications-service
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Multiple instances can run with the same consumer group
- Load balancer with sticky sessions for SSE connections
- Consider WebSocket upgrade for better connection distribution

### Performance Characteristics
- **Latency**: Optimized for sub-100ms event delivery
- **Throughput**: Handles thousands of concurrent connections
- **Memory**: Scales with number of active connections
- **CPU**: Low usage, mostly I/O bound

### Resource Requirements
- **CPU**: Low (event forwarding)
- **Memory**: Scales with connection count
- **Network**: High (SSE connections + Kafka)
- **Storage**: Minimal (in-memory only)

## 🔍 Troubleshooting

### Common Issues

1. **SSE Connection Drops**
   - Check network stability
   - Verify heartbeat intervals
   - Monitor connection timeouts

2. **High Memory Usage**
   - Monitor active connection count
   - Check for connection leaks
   - Verify cleanup processes

3. **Event Delivery Delays**
   - Check Kafka consumer lag
   - Monitor processing times
   - Verify network latency

4. **CORS Issues**
   - Verify CORS configuration
   - Check allowed origins
   - Test preflight requests

### Monitoring
- Track active SSE connections
- Monitor event delivery latency
- Watch consumer lag and processing times
- Alert on connection drops or errors

## 🔗 Dependencies

- **@project/shared**: Shared types and utilities
- **kafkajs**: Kafka client library
- **express**: HTTP server framework
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment configuration

## 📝 API Reference

### SSE Stream
- **Endpoint**: `GET /events/stream`
- **Content-Type**: `text/event-stream`
- **Purpose**: Real-time event streaming
- **Format**: Server-Sent Events

### Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Service health status
- **Response**: Health status with connection stats

### Metrics
- **Endpoint**: `GET /metrics`
- **Purpose**: Service metrics and statistics
- **Response**: Consumer and SSE metrics

### Root
- **Endpoint**: `GET /`
- **Purpose**: Service information
- **Response**: Service metadata and endpoints

## 🌐 Client Integration

### React Hook Example
```typescript
import { useEffect, useState } from 'react';

export function useSSEEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/events/stream');
    
    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'heartbeat' && data.type !== 'connection') {
        setEvents(prev => [data, ...prev.slice(0, 99)]);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  return { events, connected };
}
```

### Vanilla JavaScript Example
```javascript
class NotificationClient {
  constructor(url) {
    this.url = url;
    this.eventSource = null;
    this.listeners = new Map();
  }

  connect() {
    this.eventSource = new EventSource(this.url);
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.type, data);
    };

    this.eventSource.onerror = (error) => {
      this.emit('error', error);
    };
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Usage
const client = new NotificationClient('/events/stream');
client.on('ProductCreated', (event) => console.log('New product:', event));
client.connect();