export const ProductUpdatedSchema = {
  $id: "ProductUpdated",
  type: "object",
  required: ["type", "version", "occurredAt", "sellerId", "product"],
  properties: {
    type: { const: "ProductUpdated" },
    version: { const: "1" },
    occurredAt: { type: "string", format: "date-time" },
    sellerId: { type: "string" },
    product: {
      type: "object",
      required: ["id", "name", "price", "quantity", "category"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        quantity: { type: "integer" },
        category: { type: "string" },
      },
    },
    changes: {
      type: "object",
      description: "Optional diff of old vs new values",
      additionalProperties: {
        type: "object",
        properties: {
          old: {},
          new: {},
        },
        required: ["old", "new"],
      },
    },
  },
} as const;
