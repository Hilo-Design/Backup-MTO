import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { askClaude, SAFETY_PREAMBLE } from '../_shared/claude.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import {
  adminClient,
  commitUsage,
  ensurePlan,
  isPro,
  readBody,
  requireUser,
  userClient,
} from '../_shared/supa.ts';

interface Body {
  date?: string;
  question?: string;
  food_name?: string;
  portion_description?: string;
}

interface Advice {
  decision: 'go_ahead' | 'reduce_portion' | 'skip' | 'adjust';
  explanation: string;
  tips: string[];
}

/** Svasth's four decisions, kept so the UI banner logic ports unchanged. */
const SCHEMA = {
  type: 'object',
  required: ['decision', 'explanation', 'tips'],
  properties: {
    decision: {
      type: 'string',
      enum: ['go_ahead', 'reduce_portion', 'skip', 'adjust'],
      description:
        'go_ahead when it fits comfortably; reduce_portion when it fits at a smaller size; skip when it would clearly overshoot; adjust when the answer is conditional or the day is already at target.',
    },
    explanation: {
      type: 'string',
      description:
        'Two or three sentences, second person, citing the actual numbers you were given (remaining calories, protein, and so on). No preamble.',
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Zero to three short, concrete actions. Each must be specific to this user\'s numbers and to Indian home cooking where relevant. Omit rather than pad.',
    },
  },
} as const;

Deno.serve(serve(async (req) => {
  const supabase = userClient(req);
  const user = await requireUser(supabase);
  const admin = adminClient();

  const body = await readBody<Body>(req);
  const question = (body.question ?? '').trim();
  const date = body.date ?? new Date().toISOString().slice(0, 10);

  if (!question) throw new HttpError(400, 'question is required');

  // ── quota ───────────────────────────────────────────────────────────────
  const plan = await ensurePlan(admin, user.id);
  if (!isPro(plan) && plan.advisor_usage_this_month >= plan.advisor_monthly_limit) {
    throw new HttpError(
      429,
      `You have used all ${plan.advisor_monthly_limit} free advisor checks this month. ` +
        'Upgrade to Bas Pro for unlimited guidance.',
    );
  }

  // ── the day so far ──────────────────────────────────────────────────────
  const [{ data: log }, { data: targetsRow }, { data: meals }] = await Promise.all([
    supabase.from('daily_logs').select('*').eq('date', date).maybeSingle(),
    supabase.from('targets').select('*').maybeSingle(),
    supabase
      .from('meals')
      .select('meal_type, total_calories, total_protein, total_carbs, total_fiber')
      .eq('date', date),
  ]);

  const t = {
    calories: targetsRow?.calories_target ?? 1800,
    protein: targetsRow?.protein_target ?? 100,
    carbs: targetsRow?.carbs_target ?? 200,
    fiber: targetsRow?.fiber_target ?? 25,
    water: targetsRow?.water_target ?? 2500,
  };

  // Macros come from logged meals; fall back to the daily log's manual totals.
  const mealSum = (k: string) =>
    (meals ?? []).reduce(
      (a: number, m: Record<string, number | null>) => a + (m[k] ?? 0),
      0,
    );
  const pick = (fromMeals: number, fromLog: number | null | undefined) =>
    fromMeals !== 0 ? fromMeals : (fromLog ?? 0);

  const consumed = {
    calories: pick(mealSum('total_calories'), log?.calories),
    protein: pick(mealSum('total_protein'), log?.protein),
    carbs: pick(mealSum('total_carbs'), log?.carbs),
    fiber: pick(mealSum('total_fiber'), log?.fiber),
    water: log?.water ?? 0,
  };

  const remaining = {
    calories: t.calories - consumed.calories,
    protein: t.protein - consumed.protein,
    carbs: t.carbs - consumed.carbs,
    fiber: t.fiber - consumed.fiber,
    water: t.water - consumed.water,
  };

  // Symptoms matter for this audience — reflux after late heavy meals is the
  // single most common complaint in the source app's own copy.
  const context = {
    question,
    food_name: body.food_name ?? null,
    portion_description: body.portion_description ?? null,
    local_time: new Date().toISOString(),
    targets: t,
    consumed_today: consumed,
    remaining_today: remaining,
    meals_so_far: meals ?? [],
    today_symptoms: log
      ? {
        energy: log.energy,
        reflux: log.reflux,
        post_meal_sleepiness: log.post_meal_sleepiness,
        stress: log.stress,
        headache: log.headache,
        sleep_hours: log.sleep_hours,
        bowel_movement: log.bowel_movement,
      }
      : null,
  };

  const { data: advice, tokens } = await askClaude<Advice>({
    system: `${SAFETY_PREAMBLE}

You are answering a single question about a meal the user is about to eat, or
has just eaten. Ground every claim in the numbers provided — remaining
calories, remaining protein, what they have already eaten, and any symptoms
they logged today.

The audience is Indian professionals, so assume Indian home cooking: roti,
rice, dal, sabzi, paneer, curd, chai. Portion advice should be in those terms
("half a katori", "one roti instead of two"), not in grams of chicken breast.

Two specifics worth knowing: plant iron absorbs far better with vitamin C and
far worse with tea or coffee taken alongside; and late heavy meals reliably
worsen reflux, which many of these users track daily.

Pick the decision honestly. If the meal fits, say go_ahead and do not invent a
caveat to seem useful. If the day is already at target, adjust is more honest
than skip — people still need to eat when they are genuinely hungry.`,
    content: [{
      type: 'text',
      text: `Answer this question.\n\n${JSON.stringify(context, null, 2)}`,
    }],
    toolName: 'give_meal_advice',
    toolDescription: 'Answer the user\'s meal question with a decision, an explanation and optional tips.',
    schema: SCHEMA,
    maxTokens: 1200,
  });

  // Only charge for a check that actually produced an answer.
  await commitUsage(admin, user.id, plan);

  return json({
    decision: advice.decision,
    explanation: advice.explanation,
    tips: advice.tips ?? [],
    remainingCalories: remaining.calories,
    remainingProtein: remaining.protein,
    remainingCarbs: remaining.carbs,
    remainingFiber: remaining.fiber,
    remainingWater: remaining.water,
    tokensUsed: tokens,
  });
}));
