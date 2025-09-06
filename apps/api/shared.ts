export const KafkaBrokers = [
  process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS : "localhost:9092",
];
