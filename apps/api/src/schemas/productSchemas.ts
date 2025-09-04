import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive'),
});

export const updateProductSchema = z.object({
  name: z.string().optional(),
  price: z.number().positive().optional(),
});
