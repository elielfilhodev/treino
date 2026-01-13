import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET é obrigatório"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET é obrigatório"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

