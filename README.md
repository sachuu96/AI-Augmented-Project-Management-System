1. create openAPI schema - contract for REST API endpoints

# next step is to create schema for events - contract driven event definitions 
2. create packages/event-schemas and go inside it
    1. run `npm install typescript`
    2. run `npx tsc --init` - this will create tsconfig.json
    3. add this to config `"resolveJsonModule": true,`
    4. now create JSON schema for ProductCreated, ProductUpdated, ProductDeleted and LowStockWarning events
    5. export these as TS types - run `npm install --save-dev json-schema-to-ts` and expose them through types.ts


# create docker-compose.yml file to start all the services and dependencies with one command

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

