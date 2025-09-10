import { z } from "zod";

/**
 * Base Product schema
 */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  quantity: z.number().int(),
  category: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * ProductCreated event
 */
export const ProductCreatedSchema = z.object({
  type: z.literal("ProductCreated"),
  version: z.string(),
  occurredAt: z.string().datetime(),
  sellerId: z.string(),
  product: ProductSchema,
});

export type ProductCreated = z.infer<typeof ProductCreatedSchema>;

/**
 * ProductUpdated event
 * (You’ll need to define UpdateProductInput separately and import it here)
 */
const UpdateProductInputSchema = z.object({
  // 👇 define fields that can be updated
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.number().optional(),
  quantity: z.number().int().optional(),
  category: z.string().optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

export const ProductUpdatedSchema = z.object({
  type: z.literal("ProductUpdated"),
  version: z.string(),
  occurredAt: z.string().datetime(),
  sellerId: z.string(),
  product: ProductSchema,
  changes: UpdateProductInputSchema,
});

export type ProductUpdated = z.infer<typeof ProductUpdatedSchema>;

/**
 * ProductDeleted event
 */
export const ProductDeletedSchema = z.object({
  type: z.literal("ProductDeleted"),
  version: z.string(),
  occurredAt: z.string().datetime(),
  sellerId: z.string(),
  productId: z.string().uuid(),
});

export type ProductDeleted = z.infer<typeof ProductDeletedSchema>;

/**
 * LowStockWarning event
 */
export const LowStockWarningSchema = z.object({
  type: z.literal("LowStockWarning"),
  version: z.string(),
  occurredAt: z.string().datetime(),
  sellerId: z.string(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  threshold: z.number().int(),
  category: z.string()
});

export type LowStockWarning = z.infer<typeof LowStockWarningSchema>;


export const EventSchema = z.discriminatedUnion("type", [
    ProductCreatedSchema,
    ProductUpdatedSchema,
    ProductDeletedSchema,
    LowStockWarningSchema,
  ]);

  export type Event = z.infer<typeof EventSchema>;