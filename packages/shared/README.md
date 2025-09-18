# Shared Package (@project/shared)

The shared package contains common types, constants, utilities, and configurations used across all microservices in the AI-Augmented Project Management System.

## 🎯 Purpose

- **Type Safety**: Shared TypeScript types and schemas
- **Event Schemas**: Zod validation schemas for all events
- **Constants**: Kafka topics, consumer groups, and service names
- **Configuration**: Batch processing and Kafka configurations
- **Consistency**: Ensures consistent data structures across services

## 📦 Contents

### Types & Schemas (`src/types.ts`)
- **Event Types**: TypeScript interfaces for all event types
- **Zod Schemas**: Runtime validation schemas
- **Product Schema**: Product data structure validation
- **Event Validation**: Comprehensive event validation

### Constants (`src/constants.ts`)
- **Kafka Topics**: Event topic names
- **Consumer Groups**: Service consumer group IDs
- **Service Names**: Microservice identifiers
- **Kafka Brokers**: Broker configuration

### Batch Configuration (`src/batchConfig.ts`)
- **Producer Settings**: Batch sizes and timeouts
- **Consumer Settings**: Fetch sizes and wait times
- **KEDA Scaling**: Scaling thresholds and configurations
- **Environment-based**: Different configs per environment

## 🏗️ Event Schema Structure

### Base Event
```typescript
interface BaseEvent {
  id: string;
  timestamp: string;
  version: string;
}
```

### Product Events

#### ProductCreated
```typescript
interface ProductCreatedEvent extends BaseEvent {
  type: 'ProductCreated';
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    sellerId: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
```

#### ProductUpdated
```typescript
interface ProductUpdatedEvent extends BaseEvent {
  type: 'ProductUpdated';
  product: Product;
  previousProduct?: Product;
}
```

#### ProductDeleted
```typescript
interface ProductDeletedEvent extends BaseEvent {
  type: 'ProductDeleted';
  productId: string;
  sellerId: string;
}
```

#### LowStockWarning
```typescript
interface LowStockWarningEvent extends BaseEvent {
  type: 'LowStockWarning';
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  sellerId: string;
}
```

## 🔧 Configuration

### Batch Processing Configuration

The package provides environment-aware batch processing configurations:

```typescript
interface BatchConfig {
  PRODUCER: {
    BATCH_SIZE: number;
    BATCH_TIMEOUT_MS: number;
    MAX_BATCH_SIZE: number;
    ENABLE_COMPRESSION: boolean;
  };
  CONSUMER: {
    MIN_BYTES: number;
    MAX_WAIT_TIME_MS: number;
    MAX_BYTES: number;
    SESSION_TIMEOUT_MS: number;
    HEARTBEAT_INTERVAL_MS: number;
  };
  SCALING: {
    LAG_THRESHOLD: number;
    HIGH_PRIORITY_LAG_THRESHOLD: number;
    HIGH_PRIORITY_TOPICS: string[];
  };
  TOPICS: {
    PARTITIONS: number;
    REPLICATION_FACTOR: number;
  };
}
```

### Environment-Specific Defaults

| Environment | Batch Size | Timeout | Min Bytes | Max Wait |
|-------------|------------|---------|-----------|----------|
| Production  | 100        | 1000ms  | 2048      | 200ms    |
| Development | 50         | 500ms   | 1024      | 100ms    |
| Test        | 5          | 100ms   | 1         | 50ms     |

## 📋 Constants Reference

### Kafka Topics
```typescript
export const PRODUCT_CREATED = "ProductCreated";
export const PRODUCT_DELETED = "ProductDeleted";
export const PRODUCT_UPDATED = "ProductUpdated";
export const LOW_STOCK_WARNING = "LowStockWarning";
```

### Consumer Groups
```typescript
export const CONSUMER_GROUPS = {
  NOTIFICATIONS: "notifications-service",
  ANALYTICS: "analytics-group",
} as const;
```

### Service Names
```typescript
export const SERVICES = {
  API: "api-service",
  ANALYTICS: "analytics-service",
  NOTIFICATIONS: "notifications-service",
} as const;
```

## 🚀 Usage

### Installation
```bash
# In a microservice
npm install @project/shared

# Or using file reference in package.json
"@project/shared": "file:../../packages/shared"
```

### Importing Types
```typescript
import { 
  Event, 
  ProductCreatedEvent, 
  EventSchema,
  PRODUCT_CREATED,
  getBatchConfig 
} from '@project/shared';
```

### Event Validation
```typescript
import { EventSchema } from '@project/shared';

// Validate incoming event
try {
  const validEvent = EventSchema.parse(rawEventData);
  console.log('Valid event:', validEvent);
} catch (error) {
  console.error('Invalid event:', error);
}
```

### Configuration Usage
```typescript
import { getBatchConfig, validateBatchConfig } from '@project/shared';

// Get environment-specific configuration
const config = getBatchConfig();

// Validate configuration
validateBatchConfig(config);

// Use in Kafka consumer
const consumer = kafka.consumer({
  groupId: 'my-service',
  minBytes: config.CONSUMER.MIN_BYTES,
  maxWaitTimeInMs: config.CONSUMER.MAX_WAIT_TIME_MS,
});
```

## 🔄 Development Workflow

### Building the Package
```bash
# Build TypeScript to JavaScript
npm run build

# Watch for changes during development
npm run dev
```

### Adding New Event Types

1. **Define the TypeScript interface** in `src/types.ts`:
```typescript
export const NewEventSchema = BaseEventSchema.extend({
  type: z.literal('NewEvent'),
  data: z.object({
    // event-specific fields
  }),
});

export type NewEvent = z.infer<typeof NewEventSchema>;
```

2. **Add to the union type**:
```typescript
export const EventSchema = z.union([
  ProductCreatedEventSchema,
  ProductUpdatedEventSchema,
  ProductDeletedEventSchema,
  LowStockWarningEventSchema,
  NewEventSchema, // Add here
]);
```

3. **Add topic constant** in `src/constants.ts`:
```typescript
export const NEW_EVENT = "NewEvent";
```

4. **Rebuild the package**:
```bash
npm run build
```

5. **Update consuming services** to handle the new event type.

## 📊 Validation Features

### Runtime Type Checking
- **Zod Integration**: Runtime validation with TypeScript inference
- **Error Messages**: Detailed validation error reporting
- **Type Safety**: Compile-time and runtime type safety

### Schema Benefits
- **Data Integrity**: Ensures consistent data structures
- **API Contracts**: Clear contracts between services
- **Documentation**: Self-documenting schemas
- **Versioning**: Schema evolution support

## 🔧 Configuration Validation

The package includes configuration validation:

```typescript
import { validateBatchConfig } from '@project/shared';

try {
  validateBatchConfig(); // Validates current environment config
  console.log('Configuration is valid');
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

### Validation Rules
- Batch size must be greater than 0
- Timeout values must be positive
- Max batch size must be >= batch size
- Consumer settings must be positive
- Scaling thresholds must be positive

## 📈 Performance Considerations

### Bundle Size
- **Tree Shaking**: Only import what you need
- **Minimal Dependencies**: Only Zod for validation
- **TypeScript Only**: No runtime overhead for types

### Runtime Performance
- **Validation Caching**: Zod schemas are compiled once
- **Efficient Parsing**: Fast validation with detailed errors
- **Memory Efficient**: Minimal memory footprint

## 🔗 Dependencies

- **zod**: Schema validation and TypeScript inference
- **@types/node**: Node.js type definitions (dev dependency)

## 📝 API Reference

### Functions

#### `getBatchConfig()`
Returns environment-specific batch processing configuration.

#### `validateBatchConfig(config?)`
Validates batch configuration, throws error if invalid.

### Types

#### `Event`
Union type of all possible events.

#### `EventType`
String literal type of all event type names.

#### `Product`
Product data structure interface.

### Constants

#### Topic Names
- `PRODUCT_CREATED`
- `PRODUCT_UPDATED`
- `PRODUCT_DELETED`
- `LOW_STOCK_WARNING`

#### Consumer Groups
- `CONSUMER_GROUPS.NOTIFICATIONS`
- `CONSUMER_GROUPS.ANALYTICS`

#### Service Names
- `SERVICES.API`
- `SERVICES.ANALYTICS`
- `SERVICES.NOTIFICATIONS`

## 🧪 Testing

```bash
# Run tests (if implemented)
npm test

# Type checking
npm run type-check
```

## 📦 Publishing

For internal use, the package is referenced via file paths. For external distribution:

```bash
# Build for distribution
npm run build

# Publish to npm (if needed)
npm publish
```

## 🔄 Versioning

The shared package should follow semantic versioning:
- **Major**: Breaking changes to event schemas or APIs
- **Minor**: New event types or non-breaking additions
- **Patch**: Bug fixes and internal improvements

When making breaking changes, ensure all consuming services are updated accordingly.