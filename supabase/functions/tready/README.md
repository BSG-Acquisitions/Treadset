# Tready edge function — V1 scaffold

The AI ops copilot's server-side endpoint. Frontend posts messages here, gets back an SSE stream.

## What's in V1

- Vercel AI SDK v6 + `@ai-sdk/anthropic` — Sonnet 4.6
- Two Anthropic prompt-cache breakpoints (persona + UI-map slice)
- Tool factory pattern — every tool closes over `organization_id` from JWT
- One static tool: `get_current_time` (proof-of-loop only; real tools land week 2)
- Conversation logged to `tready_conversations` on every turn
- Sentry stub (real SDK wiring is week 2)

## What's NOT in V1

- The 80-element UI map (tagging pass is the next deliverable; until then, `tready_ui_map` returns empty and Tready answers in plain text without highlights)
- Read tools (search_clients, get_pickups, etc.) — week 2
- Write tools (schedule_pickup, etc.) — week 5+
- Memory layer (per-user, per-tenant facts) — V3 / week 9+
- KB / RAG — V2 / week 7+

## Required env vars

Set on the Supabase project (Edge Function secrets):
- `SUPABASE_URL` — auto-populated
- `SUPABASE_ANON_KEY` — auto-populated
- `SUPABASE_SERVICE_ROLE_KEY` — auto-populated
- `ANTHROPIC_API_KEY` — manually set; **must exist before deploy**
- `SENTRY_DSN` — optional; if missing, errors log to stdout only

## Deploy

Per `CLAUDE.md` migration discipline, edge functions do not auto-deploy.

```bash
# from the repo root, after pulling latest
supabase functions deploy tready --project-ref wvjehbozyxhmgdljwsiz
```

If the Supabase CLI is not authed locally, deploy via the Supabase dashboard:
1. Open https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/functions
2. Click "New function" → name `tready`
3. Copy contents of `index.ts`, `persona.ts`, `tools.ts`, `log.ts`, `sentry.ts`
4. Click Deploy

## Test from the dashboard

After deploy, in the Functions invoke UI as `demo@treadset.com`:

```json
{
  "session_id": "test-001",
  "messages": [
    { "role": "user", "content": "What time is it on your server?" }
  ],
  "current_page": "/dashboard"
}
```

Expected response: SSE stream where Tready calls `get_current_time` and reports back the server time + tenant ID. If you see that, the loop works end-to-end.

A turn is also written to `public.tready_conversations` for the demo org. Verify with:

```sql
select session_id, turn_index, role, left(content, 80) as preview
from tready_conversations
where session_id = 'test-001'
order by turn_index;
```

You should see two rows: one `user`, one `assistant`.

## Cost expectation

V1 conversation cost: ~$0.01-0.02 per turn (no tools called) to ~$0.03-0.05 per turn (tool call + response). Anthropic prompt cache should cut the system-prompt cost by ~90% on the second turn onward; verify in the Anthropic console once usage starts.

## Known issues / TODOs

- `npm:ai@^6.0.0` import may need pinning to a specific version once the SDK 6 release shape stabilizes
- Sentry stub — real SDK wiring is on Session A's plate via Sentry MCP install
- Streaming response shape (`toDataStreamResponse`) needs verification once the frontend `useChat` lands in week 2 — may need adjustment for AI SDK v6 protocol changes
- The user's "first available org" is picked deterministically; multi-org users get a chat-UI org switcher in week 2

## Architecture defended in `TREADSET_TWO_SESSION_BRIEF.md` §3

Don't override without surfacing the question to Z first.
