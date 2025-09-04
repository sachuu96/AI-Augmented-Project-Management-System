export const LawStockWarningSchema = {
  $id: "LowStockWarning",
  type: "object",
  required: [
    "type",
    "version",
    "occurredAt",
    "sellerId",
    "productId",
    "quantity",
    "threshold",
  ],
  properties: {
    type: { const: "LowStockWarning" },
    version: { const: "1" },
    occurredAt: { type: "string", format: "date-time" },
    sellerId: { type: "string" },
    product: {
      type: "object",
      required: ["id","name","price","quantity","category"],
      properties: {
        id: { type: "string" }
      }
    }
  },
} as const;
