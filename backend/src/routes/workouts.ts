import { Router, type NextFunction, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  addExercise,
  completeWorkout,
  createWorkout,
  deleteWorkout,
  getWorkout,
  listHistory,
  listWorkouts,
  toggleExercise,
  updateExercise,
  updateWorkout,
} from "../services/workoutService.js";
import {
  createWorkoutSchema,
  exerciseSchema,
  exerciseToggleSchema,
  updateWorkoutSchema,
} from "../schemas/workoutSchemas.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = Router();

router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const day =
        typeof req.query.day === "string" ? Number.parseInt(req.query.day) : undefined;
      const workouts = await listWorkouts(
        req.user!.id,
        Number.isNaN(day!) ? undefined : day,
      );
      res.json({ workouts });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/history",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const history = await listHistory(req.user!.id);
      res.json({ history });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const workout = await getWorkout(req.user!.id, req.params.id);
      res.json({ workout });
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
      const input = createWorkoutSchema.parse(req.body);
      const workout = await createWorkout(req.user!.id, input);
      res.status(201).json({ workout });
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
      const input = updateWorkoutSchema.parse(req.body);
      const workout = await updateWorkout(req.user!.id, req.params.id, input);
      res.json({ workout });
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
      await deleteWorkout(req.user!.id, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/exercises",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = exerciseSchema.parse(req.body);
      const exercise = await addExercise(req.user!.id, req.params.id, input);
      res.status(201).json({ exercise });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/exercises/:exerciseId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = exerciseSchema.partial().parse(req.body);
      const exercise = await updateExercise(
        req.user!.id,
        req.params.id,
        req.params.exerciseId,
        input,
      );
      res.json({ exercise });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/exercises/:exerciseId/toggle",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = exerciseToggleSchema.parse(req.body);
      const exercise = await toggleExercise(
        req.user!.id,
        req.params.id,
        req.params.exerciseId,
        input.completed,
      );
      res.json({ exercise });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/complete",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const workout = await completeWorkout(req.user!.id, req.params.id);
      res.json({ workout });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

