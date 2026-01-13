import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

type TokenPayload = JwtPayload & { sub: string };

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET as string, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken() {
  // Usamos UUID para refresh token e armazenamos hash no banco
  return crypto.randomUUID();
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET as string) as TokenPayload;
}

