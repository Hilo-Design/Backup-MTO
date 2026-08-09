import { Router, type IRouter } from "express";
import { gte, lte, and, desc, eq, inArray } from "drizzle-orm";
import { db, dailyLogsTable, mealsTable, foodItemsTable } from "@workspace/db";

const router: IRouter = Router();

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const str = String(v);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const lines = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))];
  return lines.join("\n");
}

router.get("/export/daily-logs", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;

  const conditions = [eq(dailyLogsTable.userId, userId)];
  if (startDate) conditions.push(gte(dailyLogsTable.date, startDate));
  if (endDate) conditions.push(lte(dailyLogsTable.date, endDate));

  const logs = await db
    .select()
    .from(dailyLogsTable)
    .where(and(...conditions))
    .orderBy(dailyLogsTable.date);

  const headers = [
    "date", "calories", "protein", "carbs", "fat", "fiber", "water",
    "weight", "steps", "workout_minutes", "workout_type", "sleep_hours",
    "reflux", "post_meal_sleepiness", "energy", "headache", "stress",
    "bowel_movement", "hunger_before_lunch", "hunger_before_dinner",
    "hunger_before_bed", "muscle_stiffness", "notes",
  ];

  const rows = logs.map((l) => [
    l.date, l.calories, l.protein, l.carbs, l.fat, l.fiber, l.water,
    l.weight, l.steps, l.workoutMinutes, l.workoutType, l.sleepHours,
    l.reflux, l.postMealSleepiness, l.energy, l.headache, l.stress,
    l.bowelMovement, l.hungerBeforeLunch, l.hungerBeforeDinner,
    l.hungerBeforeBed, l.muscleStiffness, l.notes,
  ]);

  const csv = toCSV(headers, rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="svasth-daily-logs.csv"`);
  res.send(csv);
});

router.get("/export/meals", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;

  const conditions = [eq(mealsTable.userId, userId)];
  if (startDate) conditions.push(gte(mealsTable.date, startDate));
  if (endDate) conditions.push(lte(mealsTable.date, endDate));

  const meals = await db
    .select()
    .from(mealsTable)
    .where(and(...conditions))
    .orderBy(mealsTable.date, mealsTable.createdAt);

  const mealIds = meals.map((m) => m.id);
  const allItems = mealIds.length ? await db.select().from(foodItemsTable).where(inArray(foodItemsTable.mealId, mealIds)) : [];
  const itemsByMeal = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByMeal.has(item.mealId)) itemsByMeal.set(item.mealId, []);
    itemsByMeal.get(item.mealId)!.push(item);
  }

  const headers = [
    "date", "meal_type", "time", "total_calories", "total_protein",
    "total_carbs", "total_fat", "total_fiber", "notes", "post_meal_sleepiness",
    "food_items",
  ];

  const rows = meals.map((m) => {
    const items = itemsByMeal.get(m.id) ?? [];
    const foodSummary = items.map((fi) => `${fi.name}${fi.portion ? ` (${fi.portion}${fi.unit ?? ""})` : ""}`).join("; ");
    return [
      m.date, m.mealType, m.time, m.totalCalories, m.totalProtein,
      m.totalCarbs, m.totalFat, m.totalFiber, m.notes, m.postMealSleepiness,
      foodSummary,
    ];
  });

  const csv = toCSV(headers, rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="svasth-meals.csv"`);
  res.send(csv);
});

export default router;
