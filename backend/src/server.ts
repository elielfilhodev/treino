import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import routes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:3000"],
  }),
);
app.use(helmet());
app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(apiLimiter);

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Treino API",
    version: "1.0.0",
    description: "API REST para o app de treinos e checklist",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Healthcheck",
        responses: { 200: { description: "OK" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Criar conta",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Usuário criado" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        responses: { 200: { description: "Tokens gerados" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh token",
        responses: { 200: { description: "Tokens renovados" } },
      },
    },
    "/workouts": {
      get: {
        summary: "Listar treinos do usuário autenticado",
        responses: { 200: { description: "Lista de treinos" } },
      },
      post: {
        summary: "Criar treino com exercícios",
        responses: { 201: { description: "Treino criado" } },
      },
    },
    "/workouts/{id}/exercises/{exerciseId}/toggle": {
      patch: {
        summary: "Alternar conclusão de exercício",
        responses: { 200: { description: "Exercício atualizado" } },
      },
    },
    "/shopping-items": {
      get: { summary: "Lista de compras", responses: { 200: { description: "OK" } } },
      post: { summary: "Criar item", responses: { 201: { description: "Criado" } } },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/v1", routes);

app.use((_req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`✅ API ouvindo na porta ${env.PORT}`);
});

