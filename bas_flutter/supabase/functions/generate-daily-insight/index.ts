import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { askClaude, SAFETY_PREAMBLE } from '../_shared/claude.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { daysAgo, readBody, requireUser, today, userClient } from '../_shared/supa.ts';

interface Body {
  date?: string;
}

interface Insight {
  title: string;
  summary: string;
  detailed_explanation: string;
  recommendations: string[];
  confidence_score: number;
}

const SCHEMA = {
  type: 'object',
  required: [
    'title',
    'summary',
    'detailed_explanation',
    'recommendations',
    'confidence_score',
  ],
  properties: {
    title: {
      type: 'string',
      description: 'Under 60 characters. States the finding, not a greeting.',
    },
    summary: {
      type: 'string',
      description: 'One or two sentences the user reads on the dashboard card.',
    },
    detailed_explanation: {
      type: 'string',
      description:
        'A short paragraph naming the specific numbers and dates that support the finding.',
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
      description:
        'One to three concrete actions for today or tonight. Each must be doable without buying anything.',
    },
    confidence_score: {
      type: 'number',
      description:
        '0 to 1. Below 0.4 when there are fewer than five days of logs or the pattern is weak.',
    },
  },
} as const;

Deno.serve(serve(async (req) => {
  const supabase = userClient(req);
  const user = await requireUser(supabase);
  const body = await readBody<Body>(req);
  const targetDate = body.date ?? today();

  const [
    { data: logs },
    { data: meals },
    { data: profile },
    { data: targets },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from('daily_logs')
      .select(
        'date, energy_level, stress_level, mood, focus, sleep_hours, sleep_quality, steps, workout_minutes, workout_type, water_intake_cups, digestion_quality, stressors, notes',
      )
      .gte('date', daysAgo(14))
      .order('date', { ascending: false }),
    supabase
      .from('meals')
      .select(
        'meal_date, meal_type, total_calories, total_protein_g, total_fiber_g, energy_after_meal, satiety_level',
      )
      .gte('meal_date', daysAgo(7))
      .order('meal_date', { ascending: false }),
    supabase
      .from('health_profiles')
      .select('age, gender, primary_goal, health_conditions, dietary_restrictions')
      .maybeSingle(),
    supabase
      .from('nutrition_targets')
      .select('target_calories, target_protein_g, target_fiber_g, target_water_cups')
      .maybeSingle(),
    supabase
      .from('wellness_goals')
      .select('goal_name, goal_type, target_value, target_unit, current_progress')
      .eq('is_achieved', false),
  ]);

  if (!logs?.length) {
    throw new HttpError(
      422,
      'Not enough data yet — log at least one daily check-in first.',
    );
  }

  const context = {
    date: targetDate,
    today: logs.find((l) => l.date === targetDate) ?? null,
    recent_logs: logs,
    recent_meals: meals ?? [],
    profile,
    targets,
    active_goals: goals ?? [],
  };

  const { data: insight, tokens } = await askClaude<Insight>({
    system: `${SAFETY_PREAMBLE}

Produce exactly one insight — the single most useful thing this person could
know today. Prefer a relationship between two things they logged (sleep and
next-day energy, stress and digestion, protein and satiety) over restating a
number they can already see. If the data genuinely shows nothing interesting,
say that plainly and give a low confidence score rather than inventing a
pattern.`,
    content: [{
      type: 'text',
      text: `Here is the user's recent data.\n\n${JSON.stringify(context, null, 2)}`,
    }],
    toolName: 'record_daily_insight',
    toolDescription: "Record today's coaching insight for this user.",
    schema: SCHEMA,
    maxTokens: 1500,
  });

  const { data: saved, error } = await supabase
    .from('ai_insights')
    .insert({
      user_id: user.id,
      insight_date: targetDate,
      insight_type: 'daily_coaching',
      title: insight.title,
      summary: insight.summary,
      detailed_explanation: insight.detailed_explanation,
      recommendations: insight.recommendations,
      confidence_score: insight.confidence_score,
      data_sources: {
        daily_logs: logs.length,
        meals: meals?.length ?? 0,
        window_days: 14,
        tokens_used: tokens,
      },
    })
    .select()
    .single();

  if (error) throw new HttpError(500, error.message);

  return json({ insight: saved });
}));
