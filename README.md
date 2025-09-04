1. created openAPI schema - contract for REST API endpoints

# next step is to create schema for events - contract driven event definitions 
2. created packages/event-schemas and go inside it
    1. run `npm install typescript`
    2. run `npx tsc --init` - this will create tsconfig.json
    3. add this to config `"resolveJsonModule": true,`
    4. now create JSON schema for ProductCreated, ProductUpdated, ProductDeleted and LowStockWarning events
    5. export these as TS types - run `npm install --save-dev json-schema-to-ts` and expose them through types.ts



