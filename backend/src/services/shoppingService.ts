import { prisma } from "../lib/prisma";
import { createError } from "../lib/errors";

function ensureOwner(userId: string, resourceUserId: string) {
  if (userId !== resourceUserId) {
    throw createError.forbidden("Item não pertence ao usuário");
  }
}

export async function listShoppingItems(userId: string) {
  return prisma.shoppingItem.findMany({
    where: { userId },
    orderBy: [{ purchased: "asc" }, { updatedAt: "desc" }],
  });
}

export async function createShoppingItem(
  userId: string,
  data: { name: string; quantity?: string; purchased?: boolean },
) {
  return prisma.shoppingItem.create({
    data: { ...data, userId },
  });
}

export async function updateShoppingItem(
  userId: string,
  itemId: string,
  data: { name?: string; quantity?: string; purchased?: boolean },
) {
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) throw createError.notFound("Item não encontrado");
  ensureOwner(userId, item.userId);

  return prisma.shoppingItem.update({ where: { id: itemId }, data });
}

export async function toggleShoppingItem(
  userId: string,
  itemId: string,
  purchased?: boolean,
) {
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) throw createError.notFound("Item não encontrado");
  ensureOwner(userId, item.userId);

  return prisma.shoppingItem.update({
    where: { id: itemId },
    data: { purchased: purchased ?? !item.purchased },
  });
}

export async function deleteShoppingItem(userId: string, itemId: string) {
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) throw createError.notFound("Item não encontrado");
  ensureOwner(userId, item.userId);

  await prisma.shoppingItem.delete({ where: { id: itemId } });
}

