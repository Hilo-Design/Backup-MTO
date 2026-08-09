import { pgTable, serial, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthProfileTable = pgTable("health_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("seed-user"),
  ferritin: real("ferritin"),
  hemoglobin: real("hemoglobin"),
  vitaminB12: real("vitamin_b12"),
  vitaminD: real("vitamin_d"),
  hba1c: real("hba1c"),
  totalCholesterol: real("total_cholesterol"),
  ldl: real("ldl"),
  hdl: real("hdl"),
  triglycerides: real("triglycerides"),
  labDate: text("lab_date"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHealthProfileSchema = createInsertSchema(healthProfileTable).omit({ id: true, updatedAt: true });
export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;
export type HealthProfile = typeof healthProfileTable.$inferSelect;

export const targetsTable = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("seed-user"),
  caloriesTarget: real("calories_target").notNull().default(1800),
  proteinTarget: real("protein_target").notNull().default(100),
  carbsTarget: real("carbs_target").notNull().default(200),
  fatTarget: real("fat_target").default(60),
  fiberTarget: real("fiber_target").notNull().default(25),
  waterTarget: real("water_target").notNull().default(2500),
  stepsTarget: real("steps_target").default(8000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTargetsSchema = createInsertSchema(targetsTable).omit({ id: true, updatedAt: true });
export type InsertTargets = z.infer<typeof insertTargetsSchema>;
export type Targets = typeof targetsTable.$inferSelect;

export const planSettingsTable = pgTable("plan_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("seed-user"),
  plan: text("plan").notNull().default("free"), // "free" | "pro"
  advisorUsageThisMonth: real("advisor_usage_this_month").notNull().default(0),
  advisorMonthlyLimit: real("advisor_monthly_limit").notNull().default(5),
  betaProAccess: text("beta_pro_access").notNull().default("false"),
  renewalDate: text("renewal_date"),
  usageResetMonth: text("usage_reset_month"), // YYYY-MM to track when to reset
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSettingsSchema = createInsertSchema(planSettingsTable).omit({ id: true, updatedAt: true });
export type InsertPlanSettings = z.infer<typeof insertPlanSettingsSchema>;
export type PlanSettings = typeof planSettingsTable.$inferSelect;
