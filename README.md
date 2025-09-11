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


- backpreasure handle 
    - wait till kafka producer is created
    - retry 5 times to connect to dynamo database


My assumptions and justifications
---------------------------------

<b>I decided to go with kafka because</b>

- Scalability 
    - horizontal scalling - supports consumer groups so that we can increase number of consumers independetly with out effecting the producers (supports decoupling).
    - Multiple consumers can handle high volume of events which eventually improves the overall system performances
    - Designed to handle millions of events/second 
    
- Reliablity
    -  long durability and message persistance- Events are not removed from the topic after being consumed by a consumer (They are being replicated accross brokers)- long durability unlike SQS
    - unlike RabbitMQ kafka is more fault-tolerant for high-throughput and long-lived event storage
    - Kafka can handle high-throughput and best for real time data processing (That is a main requirement of the application - 10k+ rps)

- Integration
    - broad eco system support - backend service (nodejs, python, java) can all consume from kafka easily

- cost
    - open source
    - it can be cost effective for large-scale work loads
    - with it's distributed architecture it could be bit complex to configure it


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





