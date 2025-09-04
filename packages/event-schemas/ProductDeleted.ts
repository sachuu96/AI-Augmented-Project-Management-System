export const ProductDeletedSchema = {
  $id: "ProductDeleted",
  type: "object",
  required: ["type", "version", "occurredAt", "sellerId", "productId"],
  properties: {
    type: { const: "ProductDeleted" },
    version: { const: "1" },
    occurredAt: { type: "string", format: "date-time" },
    sellerId: { type: "string" },
    productId: { type: "string" },
  },
} as const;
