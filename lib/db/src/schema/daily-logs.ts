import { pgTable, serial, text, real, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyLogsTable = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("seed-user"),
  date: date("date", { mode: "string" }).notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  fiber: real("fiber"),
  water: real("water"),
  weight: real("weight"),
  steps: real("steps"),
  workoutMinutes: real("workout_minutes"),
  workoutType: text("workout_type"),
  sleepHours: real("sleep_hours"),
  reflux: real("reflux"),
  postMealSleepiness: real("post_meal_sleepiness"),
  energy: real("energy"),
  headache: real("headache"),
  stress: real("stress"),
  bowelMovement: text("bowel_movement"),
  hungerBeforeLunch: real("hunger_before_lunch"),
  hungerBeforeDinner: real("hunger_before_dinner"),
  hungerBeforeBed: real("hunger_before_bed"),
  muscleStiffness: real("muscle_stiffness"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_logs_user_date_idx").on(t.userId, t.date)]);

export const insertDailyLogSchema = createInsertSchema(dailyLogsTable).omit({ id: true, createdAt: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogsTable.$inferSelect;
