1. create openAPI schema - contract for REST API endpoints

2. next step is to create schema for events - contract driven event definitions 

create packages/event-schemas and go inside it
    1. run `npm install typescript`
    2. run `npx tsc --init` - this will create tsconfig.json
    3. add this to config `"resolveJsonModule": true,`
    4. now create JSON schema for ProductCreated, ProductUpdated, ProductDeleted and LowStockWarning events
    5. export these as TS types - run `npm install --save-dev json-schema-to-ts` and expose them through types.ts


# set up

I am using localhost node_modules therefore go inside apps/api and apps/web seperately and run 
1. `nvm use` - make sure using the correct node version
2. `npm install` - install the dependencies

check local docker demon status (on linux)

`
sudo systemctl start docker
sudo systemctl enable docker
docker info
`

`docker compose up --build` - run this from root to start everything


PostgreSQL database - for backend
redpanda - this is a Kafka-compatible event broker
         - Used by api (producer), notifier, and analytics (consumers).
DynamoDB - for storing event logs
         - Used by notifier to store recent events.
minio - S3-compatible object storage
      - Used by notifier for storing archived events.


<h1>Human validation</h1>


- AI code has emitted LowStockWarning event type during product creation only. This needs to be emitted during product update also
- Notification panel was subscribed to low_stock_alert instead of LowStockWarning which does not mactch with emited event type from the backend. Fixed it
- Manually verified and updated minio accessId and accessKey
- seperate the code into two functions (to follow single responsibility concept) 
    - writing to Dynamo db functionality 
    - saving old events to S3 functionality 
- create the dynamo db table before writing if the table does not exist
- worker.ts file connects to kafka producer and producer publishes the message with topic and payload. Then worker thread sends {success:true} object to the main thread. But in publisher.ts value of success key was not checked. Fixed it (if true - resolves. if false - rejects)
- AI generated code spins up a new worker thread and Kafka producer connection for every request, which is very expensive - I scaffold the code to use a single kafka procuder (singleton producer instance) dedicated to a one worker thread and that worker thread is dedicated to publishing.
these are the benifits I saw
- No repeated connect() / disconnect() overhead.

- No new worker thread per request.

- One long-lived producer keeps TCP connections to Kafka brokers alive, which is efficient.

- backpreasure handle 
    - wait till kafka producer is created
    - retry 5 times to connect to dynamo database

What I accepted
------------------
- When I call publishEvent("ProductCreated", payload) in through product controller, it spawns a Worker pointing at worker.ts passing the event This approach, isolates each call in its own worker thread. That worker thread does only one thing: connect -> publish event -> disconnect -> exit
That is a good approach since it decouples the application: the API handler doesn’t care how/where events are published, only that the worker will handle it.

- worker thread invocation is wrapped inside publishEvent function - following decorator pattern

My assumptions and justifications
---------------------------------

<b>I decided to go with kafka because</b>

- Kafka is designed to support multiple consumers to consume events independently unlike traditional message queues (SQS/rabbitMQ) - usage of consumer groups
-  Events are not removed from the topic after being consumed by a consumer - long durability unlike SQS
- supports decoupling - consumers can operate independetly
- scalability - Multiple consumers can handle high volume of events which eventually improves the overall system performances
- Kafka can handle high-throughput and best for real time data processing (That is a main requirement of the application - 10k+ rps)
- kafka message persistance - ensures that events are not lost in case of a failure


<b>Usage of worker threads in node js</b>

- worker threads are seperate threads that can execute js code in parallel with the main thread.
- it improves performance of the application - we can offload high computational work load to worker thread and not worry about blocking API thread.
- Best for CPU heavy operations. Publishing a message to kafka can be CPU heavy operation. 
- worker threads can handle errors and retries when publishing events to kafka
- therefore used worker threads to publish events to kafka


<b>I chose server-sent event pattern over web socket because</b>

Basically my API publishes events to kafka.
I have a consumer subscribed to the topics.
then consumer publishes to server-sent events.
my react notification component listens to SSE endpoint

- This flow is uni-directional which is the perfect match for SSE usage (web socket can be used if the flow is bi-directional)





