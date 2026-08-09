import { HttpError } from './http.ts';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/** Override with the CLAUDE_MODEL secret to move up or down a tier. */
const DEFAULT_MODEL = 'claude-sonnet-5';

export type ContentBlock =
  | { type: 'text'; text: string }
  | {
    type: 'image';
    source: { type: 'base64'; media_type: string; data: string };
  };

export interface ClaudeResult<T> {
  data: T;
  tokens: number;
  /** Raw prose Claude produced alongside the tool call, if any. */
  text: string;
}

/**
 * Calls Claude and forces a single tool call, which is how we get JSON that
 * actually matches a schema instead of parsing prose and hoping.
 */
export async function askClaude<T>(opts: {
  system: string;
  content: ContentBlock[];
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<ClaudeResult<T>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new HttpError(
      500,
      'ANTHROPIC_API_KEY is not set. Add it under Edge Functions -> Secrets.',
    );
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('CLAUDE_MODEL') ?? DEFAULT_MODEL,
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
    // 429 and 529 are worth surfacing distinctly so the app can retry.
    throw new HttpError(
      res.status === 429 || res.status === 529 ? res.status : 502,
      `Claude API error (${res.status}): ${detail.slice(0, 500)}`,
    );
  }

  const payload = await res.json();
  const blocks = (payload.content ?? []) as Array<Record<string, unknown>>;

  const toolUse = blocks.find((b) => b.type === 'tool_use');
  if (!toolUse) {
    throw new HttpError(502, 'Claude returned no structured result');
  }

  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => String(b.text ?? ''))
    .join('\n')
    .trim();

  const usage = payload.usage ?? {};
  return {
    data: toolUse.input as T,
    tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    text,
  };
}

/**
 * Shared guardrail. Bas is a wellness product, not a clinician, and the lab and
 * symptom features are the ones most likely to be read as medical advice.
 */
export const SAFETY_PREAMBLE = `
You are the coaching engine inside Bas, a wellness app for busy professionals
aged roughly 30-45.

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
