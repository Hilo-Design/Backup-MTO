import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, mealsTable, foodItemsTable } from "@workspace/db";
import {
  GetMealsQueryParams,
  CreateMealBody,
  GetMealParams,
  UpdateMealParams,
  UpdateMealBody,
  DeleteMealParams,
  CreateFoodItemBody,
  UpdateFoodItemParams,
  UpdateFoodItemBody,
  DeleteFoodItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getMealWithItems(id: number, userId: string) {
  const [meal] = await db.select().from(mealsTable).where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId))).limit(1);
  if (!meal) return null;
  const items = await db.select().from(foodItemsTable).where(eq(foodItemsTable.mealId, id));
  return { ...meal, foodItems: items };
}

router.get("/meals", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = GetMealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date } = parsed.data;
  const meals = date
    ? await db.select().from(mealsTable).where(and(eq(mealsTable.userId, userId), eq(mealsTable.date, date as string))).orderBy(mealsTable.createdAt)
    : await db.select().from(mealsTable).where(eq(mealsTable.userId, userId)).orderBy(mealsTable.createdAt);

  const mealsWithItems = await Promise.all(
    meals.map(async (meal) => {
      const items = await db.select().from(foodItemsTable).where(eq(foodItemsTable.mealId, meal.id));
      return { ...meal, foodItems: items };
    })
  );

  res.json(mealsWithItems);
});

router.post("/meals", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { foodItems, ...mealData } = parsed.data as any;

  const [meal] = await db.insert(mealsTable).values({ ...mealData, userId }).returning();

  // Insert food items if provided
  let items: any[] = [];
  if (foodItems && Array.isArray(foodItems) && foodItems.length > 0) {
    items = await db
      .insert(foodItemsTable)
      .values(foodItems.map((fi: any) => ({ ...fi, mealId: meal.id })))
      .returning();

    // Recalculate totals from food items if not explicitly provided
    if (!mealData.totalCalories && items.length > 0) {
      const totals = items.reduce(
        (acc: any, fi: any) => ({
          totalCalories: (acc.totalCalories || 0) + (fi.calories || 0),
          totalProtein: (acc.totalProtein || 0) + (fi.protein || 0),
          totalCarbs: (acc.totalCarbs || 0) + (fi.carbs || 0),
          totalFat: (acc.totalFat || 0) + (fi.fat || 0),
          totalFiber: (acc.totalFiber || 0) + (fi.fiber || 0),
        }),
        {}
      );

      const [updatedMeal] = await db
        .update(mealsTable)
        .set(totals)
        .where(eq(mealsTable.id, meal.id))
        .returning();
      res.status(201).json({ ...updatedMeal, foodItems: items });
      return;
    }
  }

  res.status(201).json({ ...meal, foodItems: items });
});

router.get("/meals/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const meal = await getMealWithItems(id, userId);
  if (!meal) { res.status(404).json({ error: "Meal not found" }); return; }

  res.json(meal);
});

router.patch("/meals/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateMealBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Drizzle's .set() does not accept null for non-nullable string columns;
  // strip out any null values so only defined updates are applied.
  const setData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== null)
  );

  const [updated] = await db
    .update(mealsTable)
    .set(setData)
    .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Meal not found" }); return; }

  const items = await db.select().from(foodItemsTable).where(eq(foodItemsTable.mealId, id));
  res.json({ ...updated, foodItems: items });
});

router.delete("/meals/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(mealsTable).where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId)));
  res.sendStatus(204);
});

// Food items
router.post("/food-items", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateFoodItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const owned = await getMealWithItems(parsed.data.mealId, userId);
  if (!owned) { res.status(404).json({ error: "Meal not found" }); return; }

  const [item] = await db.insert(foodItemsTable).values(parsed.data as any).returning();
  res.status(201).json(item);
});

router.patch("/food-items/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateFoodItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const setData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== null)
  );

  const [existing] = await db.select().from(foodItemsTable).where(eq(foodItemsTable.id, id)).limit(1);
  if (!existing || !(await getMealWithItems(existing.mealId, userId))) {
    res.status(404).json({ error: "Food item not found" });
    return;
  }

  const [item] = await db
    .update(foodItemsTable)
    .set(setData)
    .where(eq(foodItemsTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Food item not found" }); return; }
  res.json(item);
});

router.delete("/food-items/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [fi] = await db.select().from(foodItemsTable).where(eq(foodItemsTable.id, id)).limit(1);
  if (fi && !(await getMealWithItems(fi.mealId, userId))) { res.status(404).json({ error: "Food item not found" }); return; }
  await db.delete(foodItemsTable).where(eq(foodItemsTable.id, id));
  res.sendStatus(204);
});

export default router;
