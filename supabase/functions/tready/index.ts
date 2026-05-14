/**
 * Tready V1 edge function — main entry.
 *
 * This is the AI ops copilot's server-side endpoint. The frontend
 * (TreadyChat, week 2) POSTs messages here and consumes the SSE stream.
 *
 * Architecture:
 *   - Vercel AI SDK v6 + @ai-sdk/anthropic
 *   - Sonnet 4.6 main model (Haiku 4.5 reserved for nav/highlight in V2)
 *   - Two Anthropic prompt-cache breakpoints:
 *       1. TREADY_PERSONA (rarely changes, cached for hours)
 *       2. UI map slice for the user's current route (stable per route)
 *   - Tool factory pattern: every tool closes over org_id from JWT,
 *     model cannot override
 *   - Conversation logged to tready_conversations on every turn
 *   - Sentry-ready (stub for V1; real SDK in week 2)
 *
 * Multi-tenancy:
 *   - Auth verified via Supabase JWT on every request
 *   - organization_id derived server-side from user_organization_roles,
 *     never trusted from request body, never overridable by model
 *   - All tools constructed per-request with org_id closed over
 *
 * Per CLAUDE.md migration discipline: this file does NOT auto-deploy.
 * After committing, run `supabase functions deploy tready` manually.
 */
import { streamText, stepCountIs, type ModelMessage } from 'npm:ai@^6.0.0';
import { createAnthropic } from 'npm:@ai-sdk/anthropic@^2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { TREADY_PERSONA } from './persona.ts';
import { buildToolFactory } from './tools.ts';
import { logTurn } from './log.ts';
import { initSentry, captureError } from './sentry.ts';

initSentry();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------- Request schema ----------
interface TreadyRequest {
  /** Reuse across turns to group them into one conversation. Generated client-side on first turn. */
  session_id: string;
  /** Conversation history. The LAST entry must be the new user message. */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** The route the user is currently viewing — drives UI map slice. */
  current_page: string;
  /** Optional: which element on the page the user has focused/clicked. */
  focused_element_id?: string;
}

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    // ---------- Step 1: validate env ----------
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      captureError(new Error('Missing Supabase env vars'), { fn: 'tready' });
      return jsonResponse({ error: 'server_misconfigured' }, 500);
    }
    if (!anthropicApiKey) {
      captureError(new Error('Missing ANTHROPIC_API_KEY'), { fn: 'tready' });
      return jsonResponse({ error: 'anthropic_key_missing' }, 500);
    }

    // ---------- Step 2: auth ----------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'invalid_token' }, 401);
    }

    // ---------- Step 3: derive org_id from JWT (server-side, model can't override) ----------
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRow, error: userError } = await serviceClient
      .from('users')
      .select('id, first_name, last_name, email, user_organization_roles!inner(organization_id, role)')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (userError || !userRow || !(userRow as any).user_organization_roles?.length) {
      return jsonResponse({ error: 'user_not_in_any_org' }, 403);
    }

    const userId = (userRow as any).id;
    // V1 picks the FIRST org the user is in. Multi-org users will get an
    // org-switcher in the chat UI (week 2). For now, this matches the
    // existing TreadSet auth flow which also picks first-available.
    const firstRole = (userRow as any).user_organization_roles[0];
    const organizationId = firstRole.organization_id;
    const userRole = firstRole.role;

    // ---------- Step 4: parse + validate request ----------
    let body: TreadyRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }
    if (!body.session_id || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: 'session_id_and_messages_required' }, 400);
    }
    const sessionId = body.session_id;
    const currentPage = body.current_page ?? 'unknown';
    const turnIndex = body.messages.length - 1; // 0-based; the new user msg's index

    // ---------- Step 5: log inbound user turn (don't block on failure) ----------
    const lastMessage = body.messages[body.messages.length - 1];
    if (lastMessage?.role === 'user') {
      logTurn(serviceClient, {
        organization_id: organizationId,
        user_id: userId,
        session_id: sessionId,
        turn_index: turnIndex,
        role: 'user',
        content: lastMessage.content,
        ui_context: {
          page: currentPage,
          role: userRole,
          focused_element_id: body.focused_element_id,
        },
      }).catch((e) => captureError(e, { fn: 'logTurn:user', sessionId }));
    }

    // ---------- Step 6: build the system prompt with TWO CACHE BREAKPOINTS ----------
    // V1 has no UI-map content yet (the 80-element tagging pass produces it
    // and the migration to populate tready_ui_map is a follow-up task).
    // The breakpoint shape is wired correctly so V1.5 just plugs in the data.
    const uiMapSlice = await getUIMapForRoute(serviceClient, currentPage);

    const systemMessages: ModelMessage[] = [
      // Cache breakpoint 1: static persona
      {
        role: 'system',
        content: TREADY_PERSONA,
        providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
      },
      // Cache breakpoint 2: UI-map slice for current route
      {
        role: 'system',
        content: uiMapSlice,
        providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
      },
      // Dynamic context (NOT cached — varies per request)
      {
        role: 'system',
        content: buildDynamicContext({
          firstName: (userRow as any).first_name,
          lastName: (userRow as any).last_name,
          role: userRole,
          page: currentPage,
          focusedElementId: body.focused_element_id,
        }),
      },
    ];

    // ---------- Step 7: tool factory (closes over org_id from JWT) ----------
    const tools = buildToolFactory({
      organizationId,
      userId,
      userRole,
      supabaseClient: serviceClient,
    });

    // ---------- Step 8: stream from Claude Sonnet 4.6 ----------
    const anthropic = createAnthropic({ apiKey: anthropicApiKey });
    const startTime = Date.now();

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      messages: [
        ...systemMessages,
        ...body.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      tools,
      stopWhen: stepCountIs(10),
      onFinish: async ({ text, usage, finishReason, response }) => {
        try {
          const toolCalls = response.messages
            .flatMap((m: any) =>
              Array.isArray(m.content)
                ? m.content.filter((c: any) => c.type === 'tool-call')
                : [],
            );

          await logTurn(serviceClient, {
            organization_id: organizationId,
            user_id: userId,
            session_id: sessionId,
            turn_index: turnIndex + 1,
            role: 'assistant',
            content: text,
            tools_called: toolCalls.length > 0 ? toolCalls : undefined,
            ui_context: {
              page: currentPage,
              role: userRole,
              finish_reason: finishReason,
            },
            model: 'claude-sonnet-4-6',
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            latency_ms: Date.now() - startTime,
          });
        } catch (e) {
          captureError(e, { fn: 'logTurn:assistant', sessionId });
        }
      },
    });

    // ---------- Step 9: return SSE stream ----------
    // AI SDK v6 renamed toDataStreamResponse -> toUIMessageStreamResponse.
    // This is the protocol the React `useChat` hook consumes in week 2.
    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
    });
  } catch (error) {
    captureError(error, { fn: 'tready', stage: 'handler' });
    return jsonResponse({ error: 'internal_error', detail: (error as Error).message }, 500);
  }
});

// ---------- Helpers ----------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function buildDynamicContext(args: {
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  page: string;
  focusedElementId?: string;
}): string {
  const name = [args.firstName, args.lastName].filter(Boolean).join(' ') || 'the user';
  const parts = [
    `Current user: ${name}`,
    `Role: ${args.role}`,
    `Current page: ${args.page}`,
  ];
  if (args.focusedElementId) {
    parts.push(`Currently focused on: ${args.focusedElementId}`);
  }
  parts.push(`Current server time: ${new Date().toISOString()}`);
  return parts.join('\n');
}

async function getUIMapForRoute(supabaseClient: any, route: string): Promise<string> {
  // V1: tready_ui_map is empty until the 80-element tagging pass populates it.
  // The query shape is correct so V1.5 just adds rows and this function lights up.
  try {
    const { data, error } = await supabaseClient
      .from('tready_ui_map')
      .select('element_id, label, description, location_hint, required_app_state')
      .eq('page_path', route)
      .eq('is_active', true)
      .limit(100);

    if (error || !data || data.length === 0) {
      return `UI map for ${route}: (no elements registered yet — V1 scaffold). When the user asks how to do something on this page, answer in plain English without pointing at specific buttons. The visual-highlight feature lights up in V1.5.`;
    }

    const lines = data.map((e: any) => {
      const stateNote = e.required_app_state
        ? ` [requires: ${JSON.stringify(e.required_app_state)}]`
        : '';
      const loc = e.location_hint ? ` — ${e.location_hint}` : '';
      return `- \`${e.element_id}\` "${e.label}": ${e.description}${loc}${stateNote}`;
    });

    return `UI map for ${route} (use exact element_ids when pointing at the UI):\n${lines.join('\n')}`;
  } catch (e) {
    captureError(e, { fn: 'getUIMapForRoute', route });
    return `UI map for ${route}: (lookup failed — answering without highlights)`;
  }
}
