import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { askClaude, SAFETY_PREAMBLE } from '../_shared/claude.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { daysAgo, logConversation, readBody, requireUser, userClient } from '../_shared/supa.ts';

interface Body {
  question?: string;
}

interface Recommendation {
  focus_area: string;
  why_this_matters_now: string;
  next_steps: Array<{
    action: string;
    rationale: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  what_to_ignore: string;
  summary: string;
}

const SCHEMA = {
  type: 'object',
  required: [
    'focus_area',
    'why_this_matters_now',
    'next_steps',
    'what_to_ignore',
    'summary',
  ],
  properties: {
    focus_area: {
      type: 'string',
      description: 'The single highest-leverage area right now. Just one.',
    },
    why_this_matters_now: {
      type: 'string',
      description: 'Grounded in their actual logged data, citing numbers.',
    },
    next_steps: {
      type: 'array',
      description: 'Two to four steps, ordered by leverage.',
      items: {
        type: 'object',
        required: ['action', 'rationale', 'effort'],
        properties: {
          action: {
            type: 'string',
            description: 'Specific and testable, not "eat better".',
          },
          rationale: { type: 'string' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    what_to_ignore: {
      type: 'string',
      description:
        'One thing they could reasonably deprioritise right now, and why. Focus is the product.',
    },
    summary: { type: 'string', description: 'Two sentences.' },
  },
} as const;

Deno.serve(serve(async (req) => {
  const supabase = userClient(req);
  const user = await requireUser(supabase);
  const { question } = await readBody<Body>(req);

  const [
    { data: profile },
    { data: goals },
    { data: targets },
    { data: logs },
    { data: meals },
    { data: labs },
    { data: recentInsights },
  ] = await Promise.all([
    supabase
      .from('health_profiles')
      .select(
        'age, gender, height_cm, goal_weight_kg, primary_goal, dietary_restrictions, health_conditions, plan_type',
      )
      .maybeSingle(),
    supabase
      .from('wellness_goals')
      .select(
        'goal_name, goal_type, target_value, target_unit, current_progress, target_date, is_achieved',
      ),
    supabase
      .from('nutrition_targets')
      .select('target_calories, target_protein_g, target_fiber_g, target_water_cups')
      .maybeSingle(),
    supabase
      .from('daily_logs')
      .select(
        'date, energy_level, stress_level, mood, focus, sleep_hours, sleep_quality, weight_kg, steps, workout_minutes, digestion_quality',
      )
      .gte('date', daysAgo(21))
      .order('date', { ascending: false }),
    supabase
      .from('meals')
      .select('meal_date, meal_type, total_calories, total_protein_g, total_fiber_g')
      .gte('meal_date', daysAgo(14)),
    supabase
      .from('lab_values')
      .select('test_date, test_name, ai_interpretation')
      .order('test_date', { ascending: false })
      .limit(1),
    // Avoid repeating advice they were given in the last few days.
    supabase
      .from('ai_insights')
      .select('insight_date, title, summary')
      .gte('insight_date', daysAgo(7))
      .order('insight_date', { ascending: false })
      .limit(5),
  ]);

  if (!logs?.length && !meals?.length) {
    throw new HttpError(
      422,
      'Not enough data yet — log a few check-ins or meals first.',
    );
  }

  const context = {
    profile,
    goals: goals ?? [],
    nutrition_targets: targets,
    daily_logs_21d: logs ?? [],
    meals_14d: meals ?? [],
    latest_labs: labs?.[0] ?? null,
    already_told_them_recently: recentInsights ?? [],
    user_question: question ?? null,
  };

  const { data: recommendation, tokens } = await askClaude<Recommendation>({
    system: `${SAFETY_PREAMBLE}

Pick one focus area. Busy professionals fail on advice volume, not advice
quality — a list of eight things is the same as no advice. Do not repeat
guidance from "already_told_them_recently" unless the data shows they acted on
it and it worked, in which case build on it. If a user question is present,
answer that specifically while still grounding it in their data.`,
    content: [{
      type: 'text',
      text: `Full wellness snapshot:\n\n${JSON.stringify(context, null, 2)}`,
    }],
    toolName: 'record_recommendation',
    toolDescription: 'Record a focused, personalised wellness recommendation.',
    schema: SCHEMA,
    maxTokens: 2000,
  });

  await logConversation(supabase, user.id, {
    triggerType: question ? 'user_question' : 'wellness_recommendation',
    triggerContext: {
      question: question ?? null,
      logs: logs?.length ?? 0,
      meals: meals?.length ?? 0,
    },
    response: recommendation.summary,
    tokens,
  });

  await supabase.from('ai_insights').insert({
    user_id: user.id,
    insight_date: new Date().toISOString().slice(0, 10),
    insight_type: 'recommendation',
    title: recommendation.focus_area,
    summary: recommendation.summary,
    detailed_explanation: recommendation.why_this_matters_now,
    recommendations: recommendation.next_steps.map((s) => s.action),
    data_sources: { logs: logs?.length ?? 0, meals: meals?.length ?? 0 },
    confidence_score: 0.7,
  });

  return json({ recommendation });
}));
