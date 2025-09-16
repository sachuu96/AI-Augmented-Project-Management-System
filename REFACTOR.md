1. removed `fromBeginning:true` property from consumer subscription

- `fromBeginning:false` is the default value so this make sure consumer will start the consumption from latest offset
- when a Kafka consumer starts for a new topic, the offset begins at zero 
- if a new consumer group is started in an existing topic, then there is no offset store

usecase: Let’s say for instance that a consumer group consumes 12 messages before failing.  When the consumer starts up again, it will continue from where it left off in the offset (or position) because that offset is stored by Kafka ZooKeeper

2. Introduced batch processing

used prompt - According to the current implementation consumer uses eachMessage , processing messages one-by-one without batching. Update the consumer configuration to switch to eachBatch for better throughput. Configure fetch.min.bytes and fetch.max.wait.ms in consumer options to control batching at the Kafka protocol level. Implement manual offset commits for exactly-once semantics. Implementation should be designed so that when event volume increases, messages accumulate in the batch queue, creating measurable lag that triggers KEDA to scale up more instances. When load decreases, instances scale down as the queue drains.

pros:
    Meaningful Consumer Lag: Batch processing creates consistent lag patterns that auto-scaling systems  can detect and respond to
    Consumer Lag = Last committed offset (by consumer group) vs. Last produced offset (in the partition)

    this allows scale based on actual event backlog, not CPU/memory - Scaling thresholds can be tuned via environment variables

But Notification service is still processing messages one by one since it needs to be real time notification handler. The producer is implemented to support both scenarios. It uses a `BatchEventPublisher` that collects events into batches based on configurable settings (e.g., `BATCH_SIZE`, `BATCH_TIMEOUT_MS`) before sending them to Kafka via a worker thread. This batching optimizes producer throughput and enables KEDA scaling, but it doesn't constrain consumer behavior. The messages are stored individually in Kafka topics, allowing the notifications-service consumer group to process them one by one and the analytics-group to process them in batches, as each consumer group has its own fetch configuration.

used redis for storing batches

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
- Integrate with existing worker.ts


4. implement "Exactly once" Concept

used prompt - refactor the kafka condigurations by
- enabling manual offset commits
- use idempotent producers
- consider transactional publishing for critical operations
- Implement deduplication logic in consumers

used `idempotent:true` producers to handle retries with out duplications

When set idempotent: true, the Kafka producer enables idempotent writes: Every producer instance is assigned a unique Producer ID (PID) by Kafka.
Every message/batch sent by that producer carries a sequence number.
The broker checks:
    If this sequence number is new → accept the write.
    If it’s a duplicate (retransmit) → drop it silently.
Result: no duplicates even if retries happen.

connect producer/consumer with re-try logic
Connection status exposed via /metrics endpoints - for KEDA integration in future


5. Handle Consumer Acknowledgment - to improve reliability

This is important when there is an error occured while event consuming. If a consumer crashes, committed offsets ensure it can resume from the right place. Without acknowledgments, Kafka can’t know if the consumer really processed the message

used prompt - Add manual acknowledgment after successful processing. Use commitOffsets() after batch processing to ensure exactly-once delivery

6. move the kafka producer to application level with centralized connection management to improve the resource management. keep using the dedicated worker threads to handle kafka operations so that main thread does not get blocked.



7. Implemented rate limit middleware

Further improvements to support sclability - micro services
-----------------------------------------------------------

According to the current implementation both producers and cosnumers live inside same microservice. 

- since now notification consumer processes messages one by one for real time, it may require more instances during peek hours unlike the analysis-service consumer (which process messages in batches). So decoupling them will allow them to scale based on the data processing needs independently 

- If one microservice experiences issues (e.g., analytics service overwhelmed by large batches), the other continues operating normally if they are two seperate micro services. This improves overall system reliability.

- KEDA integration in future - consumer lag threshold is defined as an environment variable