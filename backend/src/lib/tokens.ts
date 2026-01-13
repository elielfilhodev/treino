import crypto from "crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type TokenPayload = JwtPayload & { sub: string };

export function signAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL } as SignOptions,
  );
}

export function signRefreshToken() {
  // Usamos UUID para refresh token e armazenamos hash no banco
  return crypto.randomUUID();
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string): TokenPayload {
  const secret: string = env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret) as TokenPayload;
}

