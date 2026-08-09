import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { askClaude, SAFETY_PREAMBLE } from '../_shared/claude.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { daysAgo, logConversation, readBody, requireUser, userClient } from '../_shared/supa.ts';

interface Body {
  days?: number;
}

interface PatternAnalysis {
  summary: string;
  patterns: Array<{
    pattern: string;
    evidence: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  likely_triggers: string[];
  strategies: Array<{ strategy: string; why_this_one: string; when: string }>;
  data_gaps: string[];
}

const SCHEMA = {
  type: 'object',
  required: ['summary', 'patterns', 'likely_triggers', 'strategies', 'data_gaps'],
  properties: {
    summary: { type: 'string', description: 'Two or three sentences.' },
    patterns: {
      type: 'array',
      description: 'At most three. Omit anything the data does not support.',
      items: {
        type: 'object',
        required: ['pattern', 'evidence', 'confidence'],
        properties: {
          pattern: {
            type: 'string',
            description: 'e.g. "Stress peaks on Thursdays".',
          },
          evidence: {
            type: 'string',
            description:
              'Cite the actual dates and values. No claim without numbers.',
          },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    likely_triggers: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Grounded in what the user logged as stressors. Mark as hypotheses, not facts.',
    },
    strategies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['strategy', 'why_this_one', 'when'],
        properties: {
          strategy: { type: 'string' },
          why_this_one: {
            type: 'string',
            description: 'Tie it to this user’s specific pattern.',
          },
          when: {
            type: 'string',
            description: 'A specific moment, e.g. "Thursday before 3pm".',
          },
        },
      },
    },
    data_gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'What they should start logging to make this sharper.',
    },
  },
} as const;

/** Weekday labels help Claude reason about day-of-week effects reliably. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

Deno.serve(serve(async (req) => {
  const supabase = userClient(req);
  const user = await requireUser(supabase);
  const body = await readBody<Body>(req);
  const days = Math.min(Math.max(body.days ?? 30, 7), 90);

  const { data: logs, error } = await supabase
    .from('daily_logs')
    .select(
      'date, stress_level, energy_level, mood, focus, sleep_hours, sleep_quality, workout_minutes, workout_type, digestion_quality, bloating_level, stressors, notes',
    )
    .gte('date', daysAgo(days))
    .order('date', { ascending: true });

  if (error) throw new HttpError(500, error.message);

  const withStress = (logs ?? []).filter((l) => l.stress_level != null);
  if (withStress.length < 5) {
    throw new HttpError(
      422,
      `Need at least 5 days of stress logs to find patterns — you have ${withStress.length}.`,
    );
  }

  const enriched = withStress.map((l) => ({
    ...l,
    weekday: WEEKDAYS[new Date(`${l.date}T00:00:00Z`).getUTCDay()],
  }));

  const { data: analysis, tokens } = await askClaude<PatternAnalysis>({
    system: `${SAFETY_PREAMBLE}

You are looking for real patterns in self-reported stress data. Be rigorous:
${withStress.length} data points is a small sample, self-reports are noisy, and
correlation here is not causation. State confidence honestly and prefer "no
clear pattern" over a flattering story. Never claim a cause the user did not
log — if they never recorded a stressor, treat any trigger as a hypothesis for
them to confirm.`,
    content: [{
      type: 'text',
      text: `Daily logs over the last ${days} days (${withStress.length} with stress recorded):\n\n${
        JSON.stringify(enriched, null, 2)
      }`,
    }],
    toolName: 'record_stress_analysis',
    toolDescription: 'Record stress patterns, likely triggers and coping strategies.',
    schema: SCHEMA,
    maxTokens: 2500,
  });

  await logConversation(supabase, user.id, {
    triggerType: 'stress_pattern',
    triggerContext: { window_days: days, samples: withStress.length },
    response: analysis.summary,
    tokens,
  });

  // Also surface it in the insights feed so it isn't buried in chat history.
  await supabase.from('ai_insights').insert({
    user_id: user.id,
    insight_date: new Date().toISOString().slice(0, 10),
    insight_type: 'pattern_recognition',
    title: 'Stress pattern analysis',
    summary: analysis.summary,
    detailed_explanation: analysis.patterns
      .map((p) => `${p.pattern} — ${p.evidence} (confidence: ${p.confidence})`)
      .join('\n\n'),
    recommendations: analysis.strategies.map((s) => `${s.strategy} (${s.when})`),
    data_sources: { window_days: days, samples: withStress.length },
    confidence_score: analysis.patterns.some((p) => p.confidence === 'high')
      ? 0.8
      : analysis.patterns.some((p) => p.confidence === 'medium')
      ? 0.5
      : 0.3,
  });

  return json({ analysis });
}));
