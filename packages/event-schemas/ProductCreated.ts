export const ProductCreatedSchema = {
  $id: "ProductCreated",
  type: "object",
  required: ["type","version","occurredAt","product","sellerId"],
  properties: {
    type: { const: "ProductCreated" },
    version: { const: "1" },
    occurredAt: { type: "string", format: "date-time" },
    sellerId: { type: "string" },
    product: {
      type: "object",
      required: ["id","name","price","quantity","category"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        quantity: { type: "integer" },
        category: { type: "string" }
      }
    }
  }
} as const;