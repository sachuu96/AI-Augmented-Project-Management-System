// Kafka Configuration
export const KafkaBrokers = [
  process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS : "localhost:9092",
];

// Event Topic Names
export const PRODUCT_CREATED = "ProductCreated";
export const PRODUCT_DELETED = "ProductDeleted";
export const PRODUCT_UPDATED = "ProductUpdated";
export const LOW_STOCK_WARNING = "LowStockWarning";

// Consumer Group IDs
export const CONSUMER_GROUPS = {
  NOTIFICATIONS: "notifications-service",
  ANALYTICS: "analytics-group",
} as const;

// Service Names
export const SERVICES = {
  API: "api-service",
  ANALYTICS: "analytics-service",
  NOTIFICATIONS: "notifications-service",
} as const;