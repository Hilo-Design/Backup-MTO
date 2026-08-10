import { HttpError } from './http.ts';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/** Only these may be requested. Anything else falls back to the default. */
const ALLOWED = new Set([
  'claude-haiku-4-5',
  'claude-sonnet-5',
  'claude-opus-5',
]);

const DEFAULT_MODEL = 'claude-haiku-4-5';

export type ContentBlock =
  | { type: 'text'; text: string }
  | {
    type: 'image';
    source: { type: 'base64'; media_type: string; data: string };
  };

export interface ClaudeResult<T> {
  data: T;
  tokens: number;
  model: string;
}

/**
 * Calls Claude and forces a single tool call, which is how we get JSON that
 * matches a schema instead of parsing prose and hoping.
 *
 * Model precedence: the per-user preference passed in, then the CLAUDE_MODEL
 * secret, then the cheap default. The whitelist means a tampered client
 * cannot make the account run an arbitrary or costlier model.
 */
export async function askClaude<T>(opts: {
  system: string;
  content: ContentBlock[];
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  model?: string;
}): Promise<ClaudeResult<T>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new HttpError(
      500,
      'ANTHROPIC_API_KEY is not set. Add it under Edge Functions -> Secrets.',
    );
  }

  const requested = opts.model ?? Deno.env.get('CLAUDE_MODEL') ?? DEFAULT_MODEL;
  const model = ALLOWED.has(requested) ? requested : DEFAULT_MODEL;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      tools: [{
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.schema,
      }],
      tool_choice: { type: 'tool', name: opts.toolName },
      messages: [{ role: 'user', content: opts.content }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(
      res.status === 429 || res.status === 529 ? 503 : 502,
      `Claude API error (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = await res.json();
  const blocks = (payload.content ?? []) as Array<Record<string, unknown>>;

  const toolUse = blocks.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new HttpError(502, 'Claude returned no structured result');

  const usage = payload.usage ?? {};
  return {
    data: toolUse.input as T,
    tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    model,
  };
}

export const SAFETY_PREAMBLE = `
You are the coaching engine inside Bas, a wellness app for busy professionals
aged roughly 30-45, primarily in India.

Hard rules:
- You are not a doctor and this is not medical advice or a diagnosis.
- Never tell a user to start, stop, or change a prescription medication.
- If the data suggests something genuinely concerning, say so plainly and
  recommend they speak to a clinician. Do not be alarmist, do not speculate
  about specific diseases.
- If a user's logs suggest disordered eating, severe undereating, or acute
  distress, do not offer restriction or intensity advice. Encourage support.
- Be specific and grounded in the numbers you were given. Never invent data
  you were not shown. If evidence is thin, say the confidence is low.
- Write like a knowledgeable friend: direct, warm, concrete. No hype, no
  emoji, no motivational filler.
`.trim();
