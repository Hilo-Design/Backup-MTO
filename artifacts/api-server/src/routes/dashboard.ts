import { Router, type IRouter } from "express";
import { eq, gte, desc, lte, and } from "drizzle-orm";
import { db, dailyLogsTable, mealsTable, foodItemsTable, targetsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/today", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = new Date().toISOString().slice(0, 10);

  const [[todayLog], [targets], meals] = await Promise.all([
    db.select().from(dailyLogsTable).where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, today))).limit(1),
    db.select().from(targetsTable).where(eq(targetsTable.userId, userId)).limit(1),
    db.select().from(mealsTable).where(and(eq(mealsTable.userId, userId), eq(mealsTable.date, today))).orderBy(mealsTable.createdAt),
  ]);

  const mealsWithItems = await Promise.all(
    meals.map(async (meal) => {
      const items = await db.select().from(foodItemsTable).where(eq(foodItemsTable.mealId, meal.id));
      return { ...meal, foodItems: items };
    })
  );

  const t = targets ?? {
    id: 0,
    caloriesTarget: 1800,
    proteinTarget: 100,
    carbsTarget: 200,
    fatTarget: 60,
    fiberTarget: 25,
    waterTarget: 2500,
    stepsTarget: 8000,
    updatedAt: new Date(),
  };

  // Sum macros from meals (more accurate than daily log totals which may be manually entered)
  const mealCalories = mealsWithItems.reduce((s, m) => s + (m.totalCalories ?? 0), 0);
  const mealProtein = mealsWithItems.reduce((s, m) => s + (m.totalProtein ?? 0), 0);
  const mealCarbs = mealsWithItems.reduce((s, m) => s + (m.totalCarbs ?? 0), 0);
  const mealFiber = mealsWithItems.reduce((s, m) => s + (m.totalFiber ?? 0), 0);

  // Use meal totals if available, else daily log
  const consumedCalories = mealCalories > 0 ? mealCalories : (todayLog?.calories ?? 0);
  const consumedProtein = mealProtein > 0 ? mealProtein : (todayLog?.protein ?? 0);
  const consumedCarbs = mealCarbs > 0 ? mealCarbs : (todayLog?.carbs ?? 0);
  const consumedFiber = mealFiber > 0 ? mealFiber : (todayLog?.fiber ?? 0);
  const consumedWater = todayLog?.water ?? 0;

  function progress(consumed: number, target: number) {
    const remaining = Math.max(0, target - consumed);
    const pct = Math.min(100, Math.round((consumed / Math.max(target, 1)) * 100));
    return { consumed, target, remaining, pct };
  }

  // Calculate streak
  let streak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const [log] = await db.select({ id: dailyLogsTable.id }).from(dailyLogsTable).where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, dateStr))).limit(1);
    if (!log) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  res.json({
    date: today,
    dailyLog: todayLog ?? null,
    targets: t,
    meals: mealsWithItems,
    calories: progress(consumedCalories, t.caloriesTarget ?? 1800),
    protein: progress(consumedProtein, t.proteinTarget ?? 100),
    carbs: progress(consumedCarbs, t.carbsTarget ?? 200),
    fiber: progress(consumedFiber, t.fiberTarget ?? 25),
    water: progress(consumedWater, t.waterTarget ?? 2500),
    streak,
  });
});

router.get("/dashboard/streak", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = new Date().toISOString().slice(0, 10);

  // Current streak
  let currentStreak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const [log] = await db.select({ id: dailyLogsTable.id }).from(dailyLogsTable).where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, dateStr))).limit(1);
    if (!log) break;
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const allLogs = await db.select({ date: dailyLogsTable.date }).from(dailyLogsTable).where(eq(dailyLogsTable.userId, userId)).orderBy(dailyLogsTable.date);
  const totalDaysLogged = allLogs.length;

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;
  for (const log of allLogs) {
    const d = new Date(log.date + "T00:00:00");
    if (prevDate) {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    prevDate = d;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const lastLog = allLogs[allLogs.length - 1];

  res.json({
    currentStreak,
    longestStreak,
    totalDaysLogged,
    lastLoggedDate: lastLog?.date ?? null,
  });
});

export default router;
