import { z } from "zod";

export const CreateProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  category: z.string(),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
