import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, dailyLogsTable, targetsTable, planSettingsTable } from "@workspace/db";
import { AdvisorCheckBody } from "@workspace/api-zod";
import { ensurePlanSettings } from "./plan";

const router: IRouter = Router();

router.post("/advisor/check", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = AdvisorCheckBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { question, date, foodName, portionDescription, estimatedCalories, estimatedProtein, estimatedCarbs, estimatedFiber } = parsed.data;

  // Check plan usage
  const plan = await ensurePlanSettings(userId);
  const isPro = plan.plan === "pro" || plan.betaProAccess === "true";
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Reset usage if new month
  if (plan.usageResetMonth !== currentMonth) {
    await db.update(planSettingsTable)
      .set({ advisorUsageThisMonth: 0, usageResetMonth: currentMonth, updatedAt: new Date() })
      .where(eq(planSettingsTable.id, plan.id));
    plan.advisorUsageThisMonth = 0;
  }

  const limit = plan.advisorMonthlyLimit ?? 5;
  if (!isPro && plan.advisorUsageThisMonth >= limit) {
    res.status(429).json({
      error: "Monthly advisor limit reached",
      decision: "skip",
      explanation: "You have used all 5 free advisor checks this month. Upgrade to Svasth Pro for unlimited guidance.",
      tips: ["Upgrade to Pro for unlimited meal guidance"],
      remainingCalories: null,
      remainingProtein: null,
      remainingCarbs: null,
      remainingFiber: null,
      remainingWater: null,
    });
    return;
  }

  // Increment usage for free users
  if (!isPro) {
    await db.update(planSettingsTable)
      .set({ advisorUsageThisMonth: (plan.advisorUsageThisMonth ?? 0) + 1, updatedAt: new Date() })
      .where(eq(planSettingsTable.id, plan.id));
  }

  // Get today's log and targets
  const [todayLog] = await db.select().from(dailyLogsTable).where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, date))).limit(1);
  const [targets] = await db.select().from(targetsTable).where(eq(targetsTable.userId, userId)).limit(1);

  const t = targets ?? { caloriesTarget: 1800, proteinTarget: 100, carbsTarget: 200, fiberTarget: 25, waterTarget: 2500 };
  const consumed = {
    calories: todayLog?.calories ?? 0,
    protein: todayLog?.protein ?? 0,
    carbs: todayLog?.carbs ?? 0,
    fiber: todayLog?.fiber ?? 0,
    water: todayLog?.water ?? 0,
  };

  const remaining = {
    calories: (t.caloriesTarget ?? 1800) - consumed.calories,
    protein: (t.proteinTarget ?? 100) - consumed.protein,
    carbs: (t.carbsTarget ?? 200) - consumed.carbs,
    fiber: (t.fiberTarget ?? 25) - consumed.fiber,
    water: (t.waterTarget ?? 2500) - consumed.water,
  };

  const estCal = estimatedCalories ?? 0;
  const estProt = estimatedProtein ?? 0;
  const estCarbs = estimatedCarbs ?? 0;
  const estFiber = estimatedFiber ?? 0;

  // Rules-based decision engine
  let decision: "go_ahead" | "reduce_portion" | "skip" | "adjust" = "go_ahead";
  let explanation = "";
  const tips: string[] = [];

  const calAfter = remaining.calories - estCal;
  const protAfter = remaining.protein - estProt;
  const carbAfter = remaining.carbs - estCarbs;
  const fiberAfter = remaining.fiber - estFiber;

  const questionLower = question.toLowerCase();
  const foodLower = (foodName ?? "").toLowerCase();

  // Check for iron/B12 related questions
  const isIronQuestion = questionLower.includes("iron") || questionLower.includes("ferritin") || foodLower.includes("spinach") || foodLower.includes("lentil") || foodLower.includes("dal");
  const isProteinFocus = questionLower.includes("protein") || questionLower.includes("chicken") || foodLower.includes("chicken") || foodLower.includes("egg") || foodLower.includes("paneer");
  const isLateNight = questionLower.includes("late") || questionLower.includes("night") || questionLower.includes("bed");
  const isRicePasta = foodLower.includes("rice") || foodLower.includes("pasta") || foodLower.includes("roti") || foodLower.includes("bread");

  if (estCal > 0 && calAfter < -200) {
    decision = "skip";
    explanation = `This meal would put you ${Math.round(-calAfter)} kcal over your daily target. You've already used ${Math.round(consumed.calories)} of your ${t.caloriesTarget} kcal budget.`;
    tips.push(`Try a lighter version — halve the portion to save ~${Math.round(estCal / 2)} kcal`);
    tips.push("Consider a high-volume, low-calorie option like a salad or soup instead");
  } else if (estCal > 0 && calAfter < 0) {
    decision = "reduce_portion";
    explanation = `This food fits your goals if you reduce the portion slightly. You have ${Math.round(remaining.calories)} kcal remaining.`;
    tips.push(`Reduce to about 70% of this portion to stay within budget`);
  } else if (isIronQuestion) {
    decision = "go_ahead";
    explanation = `Good choice for iron! Plant-based iron absorbs better with vitamin C. You have ${Math.round(remaining.calories)} kcal remaining today.`;
    tips.push("Pair with vitamin C (lemon juice, amla, tomato) to boost iron absorption");
    tips.push("Avoid tea or coffee within 1 hour of this meal — they block iron absorption");
    if (remaining.protein > 10) tips.push(`You still have ${Math.round(remaining.protein)}g protein remaining — add a protein source`);
  } else if (isProteinFocus && remaining.protein > 0) {
    decision = "go_ahead";
    explanation = `Great for hitting your protein target. You still need ${Math.round(remaining.protein)}g protein today and have ${Math.round(remaining.calories)} kcal to spare.`;
    tips.push("Protein helps manage hunger and muscle recovery");
    if (estProt > 0) tips.push(`This adds ~${estProt}g protein — excellent choice`);
  } else if (isLateNight) {
    if (remaining.calories < 150) {
      decision = "skip";
      explanation = "You've already hit your calorie target for the day. A late-night snack would push you over.";
      tips.push("Try herbal tea or warm water with lemon instead");
      tips.push("Late-night eating can worsen reflux symptoms — wait until morning");
    } else {
      decision = "adjust";
      explanation = `You have ${Math.round(remaining.calories)} kcal left. A small, light snack is fine.`;
      tips.push("Keep it under 150 kcal — fruits, yogurt, or a small handful of nuts");
      tips.push("Avoid heavy or spicy foods late at night to minimise reflux");
    }
  } else if (isRicePasta && estCarbs > 0 && carbAfter < -30) {
    decision = "reduce_portion";
    explanation = `You are close to your carb limit. Reducing the portion of rice/roti will help you stay balanced.`;
    tips.push(`You have ${Math.round(remaining.carbs)}g carbs remaining — try half a serving`);
    tips.push("Fill the rest of the plate with vegetables and protein");
  } else if (remaining.calories > 0) {
    decision = "go_ahead";
    const remainingPct = Math.round((remaining.calories / (t.caloriesTarget ?? 1800)) * 100);
    explanation = `You have ${Math.round(remaining.calories)} kcal (${remainingPct}% of daily target) remaining. This fits your plan.`;
    if (remaining.protein > 15) tips.push(`You still need ${Math.round(remaining.protein)}g more protein today`);
    if (remaining.fiber > 5) tips.push(`Aim for ${Math.round(remaining.fiber)}g more fiber — add vegetables or whole grains`);
    if (remaining.water > 500) tips.push(`Remember to drink ${Math.round(remaining.water)}ml more water today`);
  } else {
    decision = "adjust";
    explanation = "You've reached your calorie target for the day. If you're genuinely hungry, a light option is better than skipping entirely.";
    tips.push("Opt for high-fiber, low-calorie foods like cucumber, celery, or herbal tea");
    tips.push("Check your hunger — sometimes thirst feels like hunger");
  }

  const afterCalories = remaining.calories - estCal;
  const afterProtein = remaining.protein - estProt;
  const afterCarbs = remaining.carbs - estCarbs;
  const afterFiber = remaining.fiber - estFiber;

  res.json({
    decision,
    explanation,
    remainingCalories: afterCalories,
    remainingProtein: afterProtein,
    remainingCarbs: afterCarbs,
    remainingFiber: afterFiber,
    remainingWater: remaining.water,
    tips,
  });
});

export default router;
