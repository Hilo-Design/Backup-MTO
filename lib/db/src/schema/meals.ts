import { pgTable, serial, text, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("seed-user"),
  date: date("date", { mode: "string" }).notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  time: text("time"),
  totalCalories: real("total_calories"),
  totalProtein: real("total_protein"),
  totalCarbs: real("total_carbs"),
  totalFat: real("total_fat"),
  totalFiber: real("total_fiber"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  postMealSleepiness: real("post_meal_sleepiness"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMealSchema = createInsertSchema(mealsTable).omit({ id: true, createdAt: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;

export const foodItemsTable = pgTable("food_items", {
  id: serial("id").primaryKey(),
  mealId: serial("meal_id").notNull().references(() => mealsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  portion: real("portion"),
  unit: text("unit"),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  fiber: real("fiber"),
});

export const insertFoodItemSchema = createInsertSchema(foodItemsTable).omit({ id: true });
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItemsTable.$inferSelect;
