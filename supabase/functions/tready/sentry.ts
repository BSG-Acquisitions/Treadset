/**
 * Sentry stub for V1.
 *
 * Brief §4 tier-1 item 3: Sentry MCP install + Sentry SDK in every edge
 * function. Session A is wiring the backend Sentry SDK; Session B (us)
 * wires the frontend Tready surface.
 *
 * For V1 this file is a placeholder so the import paths are stable. It
 * logs to console.error for now. Once @sentry/deno is installed and
 * SENTRY_DSN env var is set, the bodies of these functions get the real
 * Sentry calls — no callsite in index.ts changes.
 *
 * V1 contract:
 *   initSentry()      — call once at module load
 *   captureError(e)   — call in every catch block in index.ts
 *   captureMessage(s) — call for warnings worth surfacing (e.g. KB miss)
 */

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) {
    console.log('[tready/sentry] no SENTRY_DSN set — error reporting will go to stdout only');
    initialized = true;
    return;
  }
  // TODO(week 2 / Session A coordination): wire @sentry/deno here
  // Sentry.init({ dsn, tracesSampleRate: 0.1, environment: Deno.env.get('TREADSET_ENV') ?? 'development' });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[tready/sentry/error]', error instanceof Error ? error.message : String(error), {
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
  // TODO(week 2): Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>): void {
  console.log(`[tready/sentry/${level}]`, message, context);
  // TODO(week 2): Sentry.captureMessage(message, { level, extra: context });
}
