export class DynamoDBClient {
    constructor() {}
    send = jest.fn().mockResolvedValue({}); // always succeeds
  }
  
  export class PutItemCommand {
    constructor(public input: any) {}
  }
  