import { z } from 'zod';

// Base Event Schema
export const BaseEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  version: z.string().default('1.0'),
});

// Product Schemas
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  stock: z.number(),
  sellerId: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Event Payload Schemas
export const ProductCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('ProductCreated'),
  product: ProductSchema,
});

export const ProductUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('ProductUpdated'),
  product: ProductSchema,
  previousProduct: ProductSchema.optional(),
});

export const ProductDeletedEventSchema = BaseEventSchema.extend({
  type: z.literal('ProductDeleted'),
  productId: z.string(),
  sellerId: z.string(),
});

export const LowStockWarningEventSchema = BaseEventSchema.extend({
  type: z.literal('LowStockWarning'),
  productId: z.string(),
  productName: z.string(),
  currentStock: z.number(),
  threshold: z.number(),
  sellerId: z.string(),
});

// Union type for all events
export const EventSchema = z.union([
  ProductCreatedEventSchema,
  ProductUpdatedEventSchema,
  ProductDeletedEventSchema,
  LowStockWarningEventSchema,
]);

// TypeScript types
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreatedEvent = z.infer<typeof ProductCreatedEventSchema>;
export type ProductUpdatedEvent = z.infer<typeof ProductUpdatedEventSchema>;
export type ProductDeletedEvent = z.infer<typeof ProductDeletedEventSchema>;
export type LowStockWarningEvent = z.infer<typeof LowStockWarningEventSchema>;
export type Event = z.infer<typeof EventSchema>;

// Event type discriminator
export type EventType = Event['type'];