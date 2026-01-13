import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  getProfile,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
} from "../services/authService";
import { authenticate } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types/express";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshSession(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await getProfile(req.user!.id);
      res.json({ user: profile });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

