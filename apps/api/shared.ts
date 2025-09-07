export const KafkaBrokers = [
  process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS : "localhost:9092",
];


export const PRODUCT_CREATED = "ProductCreated";
export const PRODUCT_DELETED = "ProductDeleted";
export const PRODUCT_UPDATED = "ProductUpdated";
export const LOW_STOCK_WARNING = "LowStockWarning";