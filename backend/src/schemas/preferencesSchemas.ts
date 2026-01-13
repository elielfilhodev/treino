import { z } from "zod";

export const preferencesSchema = z.object({
  goals: z.array(z.string().min(1)).default([]),
  trainingTypes: z.array(z.string().min(1)).default([]),
});

