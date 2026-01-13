import type { NextFunction, Response } from "express";
import { createError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";
import type { AuthenticatedRequest } from "../types/express.js";

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(createError.unauthorized("Token de acesso ausente"));
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(createError.unauthorized("Token inválido ou expirado"));
  }
}

