- AI code has emitted LowStockWarning event type during product creation only. This needs to be emitted during product update also
- Notification panel was subscribed to low_stock_alert instead of LowStockWarning which does not mactch with emited event type from the backend. Fixed it
- Manually verified and updated minio accessId and accessKey
- seperate the code into two functions (to follow single responsibility concept) 
    - writing to Dynamo db functionality 
    - saving old events to S3 functionality 
- create the dynamo db table before writing if the table does not exist
- worker.ts file connects to kafka producer and producer publishes the message with topic and payload. Then worker thread sends {success:true} object to the main thread. But in publisher.ts value of success key was not checked. Fixed it (if true - resolves. if false - rejects)

What I excepted
------------------
- When I call publishEvent("ProductCreated", payload) in through product controller, it spawns a Worker pointing at worker.ts passing the event This approach, isolates each call in its own worker thread. That worker thread does only one thing: connect -> publish event -> disconnect -> exit
That is a good approach since it decouples the application: the API handler doesn’t care how/where events are published, only that the worker will handle it.



My assumptions and justifications
---------------------------------
I decided to go with kafka because

- 




