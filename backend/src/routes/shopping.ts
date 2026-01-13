import { Router, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import {
  createShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  toggleShoppingItem,
  updateShoppingItem,
} from "../services/shoppingService";
import { shoppingItemSchema } from "../schemas/shoppingSchemas";
import type { AuthenticatedRequest } from "../types/express";

const router = Router();

router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const items = await listShoppingItems(req.user!.id);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = shoppingItemSchema.parse(req.body);
      const item = await createShoppingItem(req.user!.id, input);
      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = shoppingItemSchema.partial().parse(req.body);
      const item = await updateShoppingItem(req.user!.id, req.params.id, input);
      res.json({ item });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/toggle",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = shoppingItemSchema
        .pick({ purchased: true })
        .partial()
        .parse(req.body);
      const item = await toggleShoppingItem(
        req.user!.id,
        req.params.id,
        input.purchased,
      );
      res.json({ item });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await deleteShoppingItem(req.user!.id, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

export default router;

