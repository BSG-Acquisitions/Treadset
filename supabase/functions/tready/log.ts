/**
 * Conversation logging — every Tready turn writes to public.tready_conversations.
 *
 * The schema for that table was applied directly to production via the
 * Supabase Management API on 2026-05-13 (see SESSION_LOG.md [B] entry of
 * the same date for the audit-trail note).
 *
 * The model never writes to this table. Only the edge function does.
 * RLS is enforced; only the user themselves + org admins can read their
 * own org's conversations (per the policy on the table).
 */

export interface TurnLog {
  organization_id: string;
  user_id: string;
  session_id: string;
  turn_index: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  ui_context?: Record<string, unknown>;
  tools_called?: unknown[];
  highlight_target?: string;
  escalated?: boolean;
  user_feedback?: 'thumbs_up' | 'thumbs_down' | null;
  task_completed?: boolean | null;
  latency_ms?: number;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
}

export async function logTurn(supabaseClient: any, turn: TurnLog): Promise<void> {
  const { error } = await supabaseClient
    .from('tready_conversations')
    .insert({
      ...turn,
      tools_called: turn.tools_called ? JSON.stringify(turn.tools_called) : null,
      ui_context: turn.ui_context ? JSON.stringify(turn.ui_context) : null,
    });

  if (error) {
    // Logging failures must never block the user response.
    // Surface to Sentry instead (week 2 wires Sentry; for now console.error).
    console.error('[tready/log] failed to log turn', {
      session_id: turn.session_id,
      turn_index: turn.turn_index,
      error: error.message,
    });
  }
}

export async function logEscalation(
  supabaseClient: any,
  sessionId: string,
  organizationId: string,
  userId: string,
  reason: string,
): Promise<void> {
  // V1 placeholder — week 4 wires this to the actual escalation-email edge fn
  // owned by Session A (per brief §5).
  console.warn('[tready/escalation]', {
    session_id: sessionId,
    organization_id: organizationId,
    user_id: userId,
    reason,
  });
}
