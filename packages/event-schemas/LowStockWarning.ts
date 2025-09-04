export const LawStockWarningSchema = {
    "$id": "LowStockWarning",
    "type": "object",
    "required": ["type", "version", "occurredAt", "sellerId", "productId", "quantity", "threshold"],
    "properties": {
      "type": { "const": "LowStockWarning" },
      "version": { "const": "1" },
      "occurredAt": { "type": "string", "format": "date-time" },
      "sellerId": { "type": "string" },
      "productId": { "type": "string" },
      "quantity": { "type": "integer" },
      "threshold": { "type": "integer" }
    }
  } as const;