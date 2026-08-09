import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyLogsRouter from "./daily-logs";
import mealsRouter from "./meals";
import analyzePhotoRouter from "./analyze-photo";
import healthProfileRouter from "./health-profile";
import advisorRouter from "./advisor";
import trendsRouter from "./trends";
import dashboardRouter from "./dashboard";
import exportRouter from "./export";
import planRouter from "./plan";
import { requireAuth } from "../middlewares/requireAuth";
import logRouter from "./log";
import importRouter from "./import";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
// Everything below requires an authenticated user.
router.use(requireAuth);
router.use(logRouter);
router.use(importRouter);
router.use(dailyLogsRouter);
router.use(analyzePhotoRouter);
router.use(mealsRouter);
router.use(healthProfileRouter);
router.use(advisorRouter);
router.use(trendsRouter);
router.use(dashboardRouter);
router.use(exportRouter);
router.use(planRouter);
router.use(stripeRouter);

export default router;
