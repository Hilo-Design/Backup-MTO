import {
  createClient,
  type SupabaseClient,
  type User,
} from 'jsr:@supabase/supabase-js@2';

import { HttpError } from './http.ts';

/**
 * A client bound to the *caller's* JWT, so every query this function makes is
 * still filtered by row-level security. We deliberately do not use the service
 * role key here — a bug in a prompt or a filter should never be able to read
 * another user's health data.
 */
export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    throw new HttpError(401, 'Missing Authorization header');
  }

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Identity comes from the verified JWT, never from the request body. */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'Not authenticated');
  }
  return data.user;
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Logs the AI turn so token spend and user feedback are traceable per user. */
export async function logConversation(
  supabase: SupabaseClient,
  userId: string,
  args: {
    triggerType: string;
    triggerContext: unknown;
    response: string;
    tokens: number;
  },
): Promise<void> {
  const now = new Date();
  const { error } = await supabase.from('advisor_conversations').insert({
    user_id: userId,
    conversation_date: now.toISOString().slice(0, 10),
    conversation_time: now.toISOString().slice(11, 19),
    trigger_type: args.triggerType,
    trigger_context: args.triggerContext,
    ai_response: args.response,
    ai_tokens_used: args.tokens,
  });

  // Never fail the user's request because bookkeeping failed.
  if (error) console.error('logConversation failed:', error.message);
}
