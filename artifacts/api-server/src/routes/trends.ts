import { Router, type IRouter } from "express";
import { gte, lte, and, eq } from "drizzle-orm";
import { db, dailyLogsTable } from "@workspace/db";
import { GetWeeklyTrendsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/trends/weekly", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = GetWeeklyTrendsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const weeksCount = parsed.data.weeks ?? 8;

  // Calculate start date: go back weeksCount weeks from now
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - weeksCount * 7);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = now.toISOString().slice(0, 10);

  const startDateParam = parsed.data.startDate ?? startStr;

  const rows = await db
    .select()
    .from(dailyLogsTable)
    .where(
      and(
        eq(dailyLogsTable.userId, userId),
        gte(dailyLogsTable.date, startDateParam as string),
        lte(dailyLogsTable.date, endStr)
      )
    )
    .orderBy(dailyLogsTable.date);

  // Group by week
  const weekMap = new Map<string, typeof rows>();

  for (const row of rows) {
    const d = new Date(row.date + "T00:00:00");
    // Get Monday of that week
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekStart = monday.toISOString().slice(0, 10);

    if (!weekMap.has(weekStart)) weekMap.set(weekStart, []);
    weekMap.get(weekStart)!.push(row);
  }

  const weeks = Array.from(weekMap.entries()).map(([weekStart, days]) => {
    const count = days.length;
    const avg = (key: keyof typeof days[0]) => {
      const vals = days.map((d) => d[key] as number | null).filter((v) => v != null) as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const bowelCount = days.filter((d) => d.bowelMovement && d.bowelMovement !== "none").length;

    return {
      weekStart,
      avgCalories: avg("calories"),
      avgProtein: avg("protein"),
      avgCarbs: avg("carbs"),
      avgFiber: avg("fiber"),
      avgWater: avg("water"),
      avgWeight: avg("weight"),
      avgSteps: avg("steps"),
      avgEnergy: avg("energy"),
      avgReflux: avg("reflux"),
      bowelMovementCount: bowelCount,
      daysLogged: count,
    };
  });

  res.json({ weeks });
});

export default router;
