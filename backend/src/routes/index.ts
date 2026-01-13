import { Router } from "express";
import authRoutes from "./auth";
import healthRoutes from "./health";
import preferencesRoutes from "./preferences";
import shoppingRoutes from "./shopping";
import workoutRoutes from "./workouts";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/preferences", preferencesRoutes);
router.use("/workouts", workoutRoutes);
router.use("/shopping-items", shoppingRoutes);

export default router;

