# Tready edge function — V1.2 (Build 6)

The AI ops copilot's server-side endpoint. Frontend posts messages here, gets back an SSE stream.

## What's in V1.2 (Build 6)

- Vercel AI SDK v6 + `@ai-sdk/anthropic` — Sonnet 4.6
- Two Anthropic prompt-cache breakpoints (persona + UI-map slice)
- Tool factory pattern — every tool closes over `organization_id` from JWT
- Tools wired:
  - **Read:** `get_current_time`, `get_dashboard_stats`, `list_recent_pickups`, `search_clients`, `list_pending_manifests`, `get_manifest_summary`, `list_drivers`, `search_kb`
  - **UI:** `navigate_to`, `highlight_ui`
  - **KB write (admin):** `teach_tready`
  - **Operational write (Build 6):** `schedule_pickup`, `assign_driver_to_pickup` — two-step `confirm` protocol (preview first, write only on `confirm: true`)
- UI map seeded across 10 migrations (~78 rows covering tour-relevant elements)
- Conversation logged to `tready_conversations` on every turn
- Sentry stub (real SDK wiring still pending)

## Write-tool protocol (non-negotiable)

Every write tool takes a `confirm: boolean`. The model MUST call once with `confirm: false` to surface a preview, then call again with `confirm: true` only after the user verbally confirms. The server enforces this — passing `confirm: false` returns a preview and never writes. Anything else (silence, follow-up questions, ambiguous input) does NOT count as confirmation.

See `persona.ts` "Write tools (Build 6) — preview, then confirm" for the full spec the model is instructed against.

## What's NOT in V1.2

- Memory layer (per-user, per-tenant facts) — V3
- Real Sentry SDK wiring — pending Sentry MCP install
- Write tools that touch regulated manifest content (counts, signatures, voids) — explicitly out of scope; those need a separate compliance-adjacent review

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
