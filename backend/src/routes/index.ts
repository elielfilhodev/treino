import { Router } from "express";
import authRoutes from "./auth.js";
import healthRoutes from "./health.js";
import preferencesRoutes from "./preferences.js";
import shoppingRoutes from "./shopping.js";
import workoutRoutes from "./workouts.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/preferences", preferencesRoutes);
router.use("/workouts", workoutRoutes);
router.use("/shopping-items", shoppingRoutes);

export default router;

