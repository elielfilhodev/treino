import { z } from "zod";

export const shoppingItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  purchased: z.boolean().optional(),
});

