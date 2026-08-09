import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, healthProfileTable, targetsTable } from "@workspace/db";
import {
  UpsertHealthProfileBody,
  UpdateTargetsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Ensure singleton health profile exists
async function ensureHealthProfile(userId: string) {
  const [profile] = await db.select().from(healthProfileTable).where(eq(healthProfileTable.userId, userId)).limit(1);
  if (!profile) {
    const [created] = await db.insert(healthProfileTable).values({ userId }).returning();
    return created;
  }
  return profile;
}

// Ensure singleton targets exist
async function ensureTargets(userId: string) {
  const [targets] = await db.select().from(targetsTable).where(eq(targetsTable.userId, userId)).limit(1);
  if (!targets) {
    const [created] = await db.insert(targetsTable).values({ userId }).returning();
    return created;
  }
  return targets;
}

router.get("/health-profile", async (req, res): Promise<void> => {
  const profile = await ensureHealthProfile(req.userId!);
  res.json(profile);
});

router.put("/health-profile", async (req, res): Promise<void> => {
  const parsed = UpsertHealthProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const profile = await ensureHealthProfile(req.userId!);
  const [updated] = await db
    .update(healthProfileTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(healthProfileTable.id, profile.id))
    .returning();

  res.json(updated);
});

router.get("/targets", async (req, res): Promise<void> => {
  const targets = await ensureTargets(req.userId!);
  res.json(targets);
});

router.put("/targets", async (req, res): Promise<void> => {
  const parsed = UpdateTargetsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const targets = await ensureTargets(req.userId!);
  const [updated] = await db
    .update(targetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(targetsTable.id, targets.id))
    .returning();

  res.json(updated);
});

export { ensureTargets };
export default router;
