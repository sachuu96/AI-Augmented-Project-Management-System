1. removed `fromBeginning:true` property from consumer subscription

- `fromBeginning:false` is the default value so this make sure consumer will start the consumption from latest offset
- when a Kafka consumer starts for a new topic, the offset begins at zero 
- if a new consumer group is started in an existing topic, then there is no offset store

usecase: Let’s say for instance that a consumer group consumes 12 messages before failing.  When the consumer starts up again, it will continue from where it left off in the offset (or position) because that offset is stored by Kafka ZooKeeper

2. Introduced batch processing

used prompt - According to the current implementation consumer uses eachMessage , processing messages one-by-one without batching. Update the consumer configuration to switch to eachBatch for better throughput. Configure fetch.min.bytes and fetch.max.wait.ms in consumer options to control batching at the Kafka protocol level. Implement manual offset commits for exactly-once semantics

pros:
    Meaningful Consumer Lag: Batch processing creates consistent lag patterns that auto-scaling systems  can detect and respond to

    Consumer Lag = Last committed offset (by consumer group) vs. Last produced offset (in the partition)

3. Introduce partition per topic 

used propmt - Add a kafka admin client to create topics with multiple partitions. make the partition count configurable via a env variable. Specify partition keys in producer sends for better load distribution so that related messages go together

current implementation: rely on kubernetes Horizontal pod Autoscaler (HPA) and Kubernetes Event-Driven Autoscaler (KEDA) to auto scale producer count and consumer count in a high traffic 

cons: 
- can not scale the partitions dynamically
- need to restart the service to update the partition count

Further improvements: implement dynamically scale partitions based on real-time metrics

TODO prompt: 

implement a dynamic partition manager for automatic scaling 
- Set appropriate baselines for different traffic scenarios
- Add comprehensive logging for scaling events
- Integrate with existing worker.t


4. implement "At Least One and At Most One" Concept

used prompt - refactor the kafka condigurations by
- enabling manual offset commits
- use idempotent producers
- consider transactional publishing for critical operations
- Implement deduplication logic in consumers

5. Handle Consumer Acknowledgment - to improve reliability

This is important when there is an error occured while event consuming. If a consumer crashes, committed offsets ensure it can resume from the right place. Without acknowledgments, Kafka can’t know if the consumer really processed the message

used prompt - Add manual acknowledgment after successful processing. Use commitOffsets() after batch processing to ensure exactly-once delivery

6. move the kafka producer to application level with centralized connection management to improve the resource management. keep using the dedicated worker threads to handle kafka operations so that main thread does not get blocked.