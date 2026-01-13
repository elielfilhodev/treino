import { type User } from "@prisma/client";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { createError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { hashToken, signAccessToken, signRefreshToken } from "../lib/tokens";

function ttlToMs(ttl: string) {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 1000 * 60 * 60; // fallback 1h
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

export function toPublicUser(
  user: User & { preferences?: { goals: string[]; trainingTypes: string[] } | null },
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken();
  const expiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw createError.conflict("E-mail já registrado");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      preferences: {
        create: { goals: [], trainingTypes: [] },
      },
    },
    include: { preferences: true },
  });

  const tokens = await issueTokens(user.id);
  return { user: toPublicUser(user), ...tokens };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { preferences: true },
  });
  if (!user) throw createError.unauthorized("Credenciais inválidas");

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) throw createError.unauthorized("Credenciais inválidas");

  const tokens = await issueTokens(user.id);
  return { user: toPublicUser(user), ...tokens };
}

export async function refreshSession(refreshToken: string) {
  const hashed = hashToken(refreshToken);
  const now = new Date();

  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: hashed,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: { user: { include: { preferences: true } } },
  });

  if (!stored) {
    throw createError.unauthorized("Refresh token inválido ou expirado");
  }

  // Invalida token anterior
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(stored.userId);
  return { user: toPublicUser(stored.user), ...tokens };
}

export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) throw createError.notFound("Usuário não encontrado");
  return toPublicUser(user);
}

export async function updatePreferences(
  userId: string,
  data: { goals: string[]; trainingTypes: string[] },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) throw createError.notFound("Usuário não encontrado");

  const preferences = await prisma.userPreferences.upsert({
    where: { userId },
    update: { goals: data.goals, trainingTypes: data.trainingTypes },
    create: {
      goals: data.goals,
      trainingTypes: data.trainingTypes,
      userId,
    },
  });
  return { ...toPublicUser({ ...user, preferences }), preferences };
}

