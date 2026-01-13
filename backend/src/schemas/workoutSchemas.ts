import { z } from "zod";

export const exerciseSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
  completed: z.boolean().optional(),
});

export const createWorkoutSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

export const exerciseToggleSchema = z.object({
  completed: z.boolean().optional(),
});

