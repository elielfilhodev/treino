import { Router } from "express";
import type { Response, NextFunction } from "express";
import { preferencesSchema } from "../schemas/preferencesSchemas.js";
import { authenticate } from "../middleware/auth.js";
import { getProfile, updatePreferences } from "../services/authService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = Router();

router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await getProfile(req.user!.id);
      res.json({ preferences: user.preferences ?? { goals: [], trainingTypes: [] } });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = preferencesSchema.parse(req.body);
      const result = await updatePreferences(req.user!.id, data);
      res.json({ preferences: result.preferences });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

