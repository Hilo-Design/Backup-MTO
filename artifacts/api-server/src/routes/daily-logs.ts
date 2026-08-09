import { Router, type IRouter } from "express";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { db, dailyLogsTable } from "@workspace/db";
import {
  GetDailyLogsQueryParams,
  GetDailyLogParams,
  UpdateDailyLogParams,
  UpdateDailyLogBody,
  DeleteDailyLogParams,
  CreateDailyLogBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/daily-logs", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = GetDailyLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { startDate, endDate, limit } = parsed.data;

  const conditions = [eq(dailyLogsTable.userId, userId)];
  if (startDate) conditions.push(gte(dailyLogsTable.date, startDate as string));
  if (endDate) conditions.push(lte(dailyLogsTable.date, endDate as string));

  const rows = await db
    .select()
    .from(dailyLogsTable)
    .where(and(...conditions))
    .orderBy(desc(dailyLogsTable.date))
    .limit(limit ?? 30);

  res.json(rows);
});

router.post("/daily-logs", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateDailyLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, ...rest } = parsed.data;

  // Upsert: try to find existing log for this date
  const existing = await db
    .select()
    .from(dailyLogsTable)
    .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, date)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(dailyLogsTable)
      .set(rest)
      .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, date)))
      .returning();
    res.status(201).json(updated);
    return;
  }

  const [created] = await db
    .insert(dailyLogsTable)
    .values({ userId, date, ...rest })
    .returning();

  res.status(201).json(created);
});

router.get("/daily-logs/:date", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawDate = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;

  const [log] = await db
    .select()
    .from(dailyLogsTable)
    .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, rawDate)))
    .limit(1);

  if (!log) {
    res.status(404).json({ error: "Daily log not found" });
    return;
  }

  res.json(log);
});

router.patch("/daily-logs/:date", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawDate = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;

  const parsed = UpdateDailyLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Upsert: create if doesn't exist
  const existing = await db
    .select()
    .from(dailyLogsTable)
    .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, rawDate)))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(dailyLogsTable)
      .values({ userId, date: rawDate, ...parsed.data })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(dailyLogsTable)
    .set(parsed.data)
    .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, rawDate)))
    .returning();

  res.json(updated);
});

router.delete("/daily-logs/:date", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawDate = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;

  await db.delete(dailyLogsTable).where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, rawDate)));
  res.sendStatus(204);
});

export default router;
