import { Router, type IRouter } from "express";
import { eq, and, lt, sql } from "drizzle-orm";
import { db, planSettingsTable } from "@workspace/db";
import { UpdatePlanBody } from "@workspace/api-zod";

const router: IRouter = Router();

export async function ensurePlanSettings(userId: string) {
  const [plan] = await db.select().from(planSettingsTable).where(eq(planSettingsTable.userId, userId)).limit(1);
  if (!plan) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [created] = await db
      .insert(planSettingsTable)
      .values({ userId, usageResetMonth: currentMonth })
      .returning();
    return created;
  }

  // Auto-reset usage on new month
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (plan.usageResetMonth !== currentMonth) {
    const [updated] = await db
      .update(planSettingsTable)
      .set({ advisorUsageThisMonth: 0, usageResetMonth: currentMonth, updatedAt: new Date() })
      .where(eq(planSettingsTable.id, plan.id))
      .returning();
    return updated;
  }

  return plan;
}

// Shared monthly AI quota for free users (advisor checks + AI logging composer).
// checkAiQuota: read-only pre-check so we can fail fast before an expensive AI call.
export async function checkAiQuota(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = await ensurePlanSettings(userId);
  const isPro = plan.plan === "pro" || plan.betaProAccess === "true";
  if (isPro) return { ok: true };
  const limit = plan.advisorMonthlyLimit ?? 5;
  if ((plan.advisorUsageThisMonth ?? 0) >= limit) {
    return { ok: false, error: `You have used all ${limit} free AI actions this month. Upgrade to Svasth Pro for unlimited logging & guidance.` };
  }
  return { ok: true };
}

// commitAiUsage: concurrency-safe conditional increment, called only AFTER the AI
// action succeeded so failures never burn free quota.
export async function commitAiUsage(userId: string): Promise<void> {
  const plan = await ensurePlanSettings(userId);
  const isPro = plan.plan === "pro" || plan.betaProAccess === "true";
  if (isPro) return;
  const limit = plan.advisorMonthlyLimit ?? 5;
  await db.update(planSettingsTable)
    .set({ advisorUsageThisMonth: sql`${planSettingsTable.advisorUsageThisMonth} + 1`, updatedAt: new Date() })
    .where(and(eq(planSettingsTable.id, plan.id), lt(planSettingsTable.advisorUsageThisMonth, limit)));
}

router.get("/plan", async (req, res): Promise<void> => {
  const plan = await ensurePlanSettings(req.userId!);

  res.json({
    plan: plan.plan,
    advisorUsageThisMonth: plan.advisorUsageThisMonth ?? 0,
    advisorMonthlyLimit: plan.advisorMonthlyLimit ?? 5,
    betaProAccess: plan.betaProAccess === "true",
    renewalDate: plan.renewalDate ?? null,
    updatedAt: plan.updatedAt.toISOString(),
  });
});

router.put("/plan", async (req, res): Promise<void> => {
  const parsed = UpdatePlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Entitlements (plan, betaProAccess) are NOT client-writable: Pro status may
  // only be granted by verified payment-provider events or trusted admin code.
  if (parsed.data.plan != null || parsed.data.betaProAccess != null) {
    res.status(403).json({ error: "Plan changes require a completed purchase." });
    return;
  }

  const planData = await ensurePlanSettings(req.userId!);
  const updateData: Record<string, any> = { updatedAt: new Date() };
  const [updated] = await db
    .update(planSettingsTable)
    .set(updateData)
    .where(eq(planSettingsTable.id, planData.id))
    .returning();

  res.json({
    plan: updated.plan,
    advisorUsageThisMonth: updated.advisorUsageThisMonth ?? 0,
    advisorMonthlyLimit: updated.advisorMonthlyLimit ?? 5,
    betaProAccess: updated.betaProAccess === "true",
    renewalDate: updated.renewalDate ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
