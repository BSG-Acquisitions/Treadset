/**
 * TreadyBubble — floating chat button + slide-out panel.
 *
 * V1.7: voice removed (Z, 2026-05-14). Tours are now visual-only — highlight
 * ring + caption + timing. The speak / speak_async step kinds are retained
 * as silent no-ops so existing tour scripts keep parsing; speak still
 * respects its `wait` ms so per-step pacing is preserved. Re-enabling voice
 * later is a one-line swap inside runTour.
 *
 * Implementation: hand-rolled SSE streaming via fetch. Bypasses
 * @ai-sdk/react's useChat entirely (the v5 hook captured transport
 * at first render and didn't propagate auth-token updates).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const TREADY_ENDPOINT = `${SUPABASE_URL}/functions/v1/tready`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const WELCOMED_KEY_PREFIX = 'tready_welcomed_';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Scripted "welcome tour" — deterministic, no LLM. Proves the visual
// primitives work end-to-end. Each step does ONE thing then waits.
// ============================================================================
type TourStep =
  // `speak` BLOCKS the tour on TTS completion. Use sparingly for short lines.
  | { kind: 'speak'; text: string; wait?: number }
  // `speak_async` fires TTS in parallel and continues the tour immediately.
  // Use for long orientation lines so the first highlight pops up fast.
  | { kind: 'speak_async'; text: string }
  | { kind: 'highlight'; element_id: string; caption?: string; waitForClick?: boolean; wait?: number }
  | { kind: 'navigate'; path: string; wait?: number }
  | { kind: 'pause'; ms: number };

const WELCOME_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT (parallel — first ring appears in <1s) ----
  // Long intro fires async so the user immediately sees the Clients tab pulse.
  // Voice continues talking through the highlight; no dead air, no dead screen.
  { kind: 'speak_async', text: "Welcome to TreadSet. I'll walk you through creating your first client end to end — hands on, about three minutes. Tap the highlighted Clients tab when you're ready." },
  { kind: 'pause', ms: 400 },
  { kind: 'highlight', element_id: 'topnav-clients', caption: 'Clients tab — tap to continue.', waitForClick: true },

  // ---- STEP 2: Open Add Client dialog ----
  { kind: 'speak', text: "Now tap the Add Client button.", wait: 100 },
  { kind: 'pause', ms: 800 },
  { kind: 'highlight', element_id: 'clients-add-button', caption: 'Add Client — tap to open the form.', waitForClick: true },

  // ---- STEP 3: Walk the form fields one at a time ----
  { kind: 'speak', text: "First, the company name. Try Acme Tire Recyclers.", wait: 200 },
  { kind: 'pause', ms: 800 },
  { kind: 'highlight', element_id: 'clientform-company-name', caption: 'Type the company name. Required.', wait: 9000 },

  { kind: 'speak', text: "Now the contact name — who you'll talk to there.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-contact-name', caption: 'Type the primary contact.', wait: 7000 },

  { kind: 'speak', text: "Their email goes here. Manifests and invoices auto-send to this address.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-email', caption: 'Email — used for auto-sending manifests + invoices.', wait: 7000 },

  { kind: 'speak', text: "Phone number.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-phone', caption: 'Phone, format 313-555-1234.', wait: 5500 },

  { kind: 'speak', text: "Now the pickup address — required for the compliance manifest.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-address', caption: 'Street address. Required for manifest generation.', wait: 7000 },

  { kind: 'speak', text: "City.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-city', caption: 'City.', wait: 5000 },

  { kind: 'speak', text: "State — two letters. This determines which compliance template the manifests use.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-state', caption: 'State — 2-letter code (e.g. CO, MI). Sets the compliance template.', wait: 6500 },

  { kind: 'speak', text: "ZIP code.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-zip', caption: 'ZIP code.', wait: 5000 },

  // ---- STEP 4: Submit ----
  { kind: 'speak', text: "When the form looks right, hit Save.", wait: 200 },
  { kind: 'highlight', element_id: 'client-form-submit', caption: 'Save — creates the client.', waitForClick: true },

  // ---- STEP 5: Celebrate + handoff ----
  { kind: 'speak', text: "Done. Your first client is live. They show up in the Clients list, ready to schedule pickups for. Same flow for the rest of TreadSet — tap me anytime and I'll walk you through scheduling a pickup, signing a manifest, or anything else.", wait: 200 },
  { kind: 'pause', ms: 8000 },
];

async function runTour(
  steps: TourStep[],
  navigate: (path: string) => void,
  setRunning: (b: boolean) => void,
) {
  setRunning(true);
  for (const step of steps) {
    if (step.kind === 'speak') {
      // Voice removed. Step is silent but still respects its `wait` ms so
      // per-step pacing carries over from the old voice-on tours.
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
    } else if (step.kind === 'speak_async') {
      // Voice removed. Step is a no-op — the next step runs immediately,
      // which is exactly the behavior the orientation lines wanted anyway.
    } else if (step.kind === 'highlight') {
      window.dispatchEvent(
        new CustomEvent('tready:highlight', {
          detail: { element_id: step.element_id, caption: step.caption, wait_for_click: step.waitForClick },
        }),
      );
      // If waiting for click, wait for the step-complete event; else wait the configured ms
      if (step.waitForClick) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            window.removeEventListener('tready:step-complete', handler);
            resolve();
          };
          window.addEventListener('tready:step-complete', handler);
        });
      } else if (step.wait) {
        await new Promise((r) => setTimeout(r, step.wait));
      }
    } else if (step.kind === 'navigate') {
      navigate(step.path);
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
    } else if (step.kind === 'pause') {
      await new Promise((r) => setTimeout(r, step.ms));
    }
  }
  // Clear any lingering highlight
  window.dispatchEvent(new CustomEvent('tready:clear-highlight'));
  setRunning(false);
}

// ============================================================================
// Main component
// ============================================================================
export function TreadyBubble() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tourRunning, setTourRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch + watch JWT
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (alive) setAccessToken(data.session?.access_token ?? null);
    })();
    const sub = supabase.auth.onAuthStateChange((_, session) => {
      if (alive) setAccessToken(session?.access_token ?? null);
    });
    return () => {
      alive = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // First-login auto-open (only if user hasn't been welcomed)
  useEffect(() => {
    if (loading || !user) return;
    const key = WELCOMED_KEY_PREFIX + user.id;
    if (localStorage.getItem(key)) return;
    const t = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(key, new Date().toISOString());
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, user]);

  // Listen for tready:navigate events from the navigate_to tool
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string; reason?: string }>).detail;
      console.log('[Tready/event] tready:navigate received', detail);
      if (!detail?.path) return;
      if (detail.path === location.pathname) return;
      navigate(detail.path);
    };
    window.addEventListener('tready:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('tready:navigate', onNavigate as EventListener);
  }, [navigate, location.pathname]);

  // ==========================================================================
  // sendMessage: hand-rolled SSE stream parser with verbose logging
  // ==========================================================================
  const sendMessage = useCallback(
    async (text: string) => {
      if (!accessToken) {
        setError('Not authenticated yet — wait a moment and try again.');
        return;
      }
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const assistantId = crypto.randomUUID();

      const conversation = messages.map((m) => ({ role: m.role, content: m.content }));
      conversation.push({ role: 'user', content: text });

      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
      setIsStreaming(true);
      setError(null);

      try {
        console.log('[Tready/req] sending', { sessionId, currentPage: location.pathname, turns: conversation.length });
        const response = await fetch(TREADY_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            current_page: location.pathname,
            messages: conversation,
          }),
        });

        console.log('[Tready/req] response', { status: response.status, contentType: response.headers.get('content-type') });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
        }
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        let buffer = '';
        let speechBuffer = ''; // buffer for sentence-by-sentence speech

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let nlIdx;
          while ((nlIdx = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 2);

            const dataLines = event
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart());
            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join('\n').trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            let evt: any;
            try {
              evt = JSON.parse(dataStr);
            } catch {
              continue;
            }

            // CATCH-ALL LOGGING — see every event type
            console.log('[Tready/evt]', evt.type, evt);

            if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
              assistantText += evt.delta;
              speechBuffer += evt.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
              );
            } else if (evt.type === 'tool-output-available' || evt.type === 'tool-result') {
              // Multiple possible shapes from AI SDK v5 — try them all
              const toolName = evt.toolName ?? evt.tool ?? evt.name;
              const output = evt.output ?? evt.result ?? evt.data;
              console.log('[Tready/tool]', toolName, output);

              if (toolName === 'highlight_ui' && output?.highlighted) {
                console.log('[Tready/dispatch] tready:highlight', output);
                // AUTO-CLOSE the chat panel so the highlight isn't blocked
                setIsOpen(false);
                window.dispatchEvent(
                  new CustomEvent('tready:highlight', {
                    detail: {
                      element_id: output.element_id,
                      caption: output.caption,
                      wait_for_click: output.wait_for_click,
                    },
                  }),
                );
              } else if (toolName === 'navigate_to' && output?.navigated_to) {
                console.log('[Tready/dispatch] tready:navigate', output);
                // AUTO-CLOSE the chat panel; the visual is the show
                setIsOpen(false);
                window.dispatchEvent(
                  new CustomEvent('tready:navigate', {
                    detail: { path: output.navigated_to, reason: output.reason },
                  }),
                );
              }
            } else if (evt.type === 'error') {
              throw new Error(evt.error ?? 'stream-error');
            }
          }
        }

        console.log('[Tready/req] stream done. text length:', assistantText.length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Tready/req] error:', msg);
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content));
      } finally {
        setIsStreaming(false);
      }
    },
    [accessToken, sessionId, location.pathname, messages],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isStreaming) return;
      setInput('');
      void sendMessage(text);
    },
    [input, isStreaming, sendMessage],
  );

  const startTour = useCallback(() => {
    setIsOpen(false); // get the chat panel out of the way during the tour
    void runTour(WELCOME_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  if (loading || !user) return null;

  return (
    <>
      {/* Floating bubble — pulses subtly when tour is running */}
      <button
        onClick={toggle}
        aria-label={isOpen ? 'Close Tready' : 'Open Tready'}
        data-tready-id="tready-bubble-toggle"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          border: 'none',
          background: '#16a34a',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: tourRunning
            ? '0 0 0 6px rgba(22,163,74,0.25), 0 6px 20px rgba(22, 163, 74, 0.45)'
            : '0 6px 20px rgba(22, 163, 74, 0.35), 0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90000,
          transition: 'transform 160ms ease, box-shadow 220ms ease',
          animation: tourRunning ? 'tready-bubble-pulse 1.6s ease-in-out infinite' : undefined,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
      <style>{`
        @keyframes tready-bubble-pulse {
          0%,100% { box-shadow: 0 0 0 6px rgba(22,163,74,0.20), 0 6px 20px rgba(22,163,74,0.45); }
          50%     { box-shadow: 0 0 0 14px rgba(22,163,74,0.10), 0 6px 24px rgba(22,163,74,0.65); }
        }
      `}</style>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Tready chat"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 88,
            width: 380,
            height: 580,
            maxHeight: 'calc(100vh - 120px)',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 90001,
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header — voice toggle + close */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 15 }}>Tready</div>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400 }}>Your TreadSet AI copilot</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={toggle}
                aria-label="Close"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: '#f9fafb',
            }}
          >
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px' }}>
                <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                    <Sparkles size={16} color="#16a34a" />
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>
                      Hi {user.email?.split('@')[0]} — I'm Tready
                    </p>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Hands-on tutorials walk you through every TreadSet flow.
                  </p>
                </div>

                {/* Tutorials menu — pick a hands-on walkthrough */}
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 4px 0' }}>
                  Tutorials
                </div>

                {/* The first deep tour — actually creates a client */}
                <button
                  type="button"
                  onClick={startTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Add Your First Client'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~3 minutes. Walks you through every field.
                    </div>
                  </div>
                </button>

                {/* Coming-soon tours — clicking sends a chat message so Tready
                    can talk about the flow even before the deep tour is built */}
                {[
                  { title: 'Schedule Your First Pickup', sub: 'Coming next session', prompt: 'Walk me through scheduling a pickup' },
                  { title: 'Sign Your First Manifest', sub: 'Coming next session', prompt: 'Walk me through signing a manifest' },
                  { title: 'Generate a Compliance Report', sub: 'Coming next session', prompt: 'Walk me through generating a compliance report' },
                  { title: 'Process a Drop-off', sub: 'Coming next session', prompt: 'Walk me through processing a drop-off' },
                  { title: 'Manage Trailers', sub: 'Coming next session', prompt: 'Walk me through managing trailers' },
                ].map((t) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => sendMessage(t.prompt)}
                    disabled={!accessToken || isStreaming}
                    style={{
                      textAlign: 'left',
                      background: '#fff',
                      border: '1px dashed #d1d5db',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 13,
                      color: '#111827',
                      cursor: accessToken && !isStreaming ? 'pointer' : 'not-allowed',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#16a34a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {t.sub} · or ask me about it now
                    </div>
                  </button>
                ))}

                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 4px 0' }}>
                  Or ask anything
                </div>
                {[
                  "What's on my dashboard today?",
                  'Find a client called Mountain',
                  'How many pickups did we do this week?',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={!accessToken || isStreaming}
                    style={{
                      textAlign: 'left',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#374151',
                      cursor: accessToken && !isStreaming ? 'pointer' : 'not-allowed',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#16a34a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 12 }}>
                <Loader2 size={14} className="animate-spin" /> Tready is thinking…
              </div>
            )}
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  border: '1px solid #fecaca',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <strong>Tready error:</strong> {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            style={{
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              background: '#fff',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={accessToken ? 'Ask Tready…' : 'Loading session…'}
              disabled={isStreaming}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                background: accessToken ? '#fff' : '#f3f4f6',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              style={{
                padding: '0 14px',
                borderRadius: 10,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isStreaming ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Typewriter — reveals chars at a measured pace (~22ms each) regardless of
// how fast the upstream text actually streams. Gives the JARVIS feel where
// Tready appears to be thinking + typing.
function useTypewriter(target: string, speedMs = 22): string {
  const [shown, setShown] = useState('');
  useEffect(() => {
    // If target shrunk below shown (re-render edge case), snap to target
    if (target.length <= shown.length) {
      setShown(target);
      return;
    }
    // Reveal one char at a time
    const t = setTimeout(() => {
      setShown(target.slice(0, shown.length + 1));
    }, speedMs);
    return () => clearTimeout(t);
  }, [target, shown, speedMs]);
  return shown;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  // Only typewriter for assistant messages
  const displayText = isUser ? message.content : useTypewriter(message.content, 22);
  const isCaughtUp = displayText === message.content;

  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        background: isUser ? '#16a34a' : '#ffffff',
        color: isUser ? '#fff' : '#111827',
        padding: '8px 12px',
        borderRadius: 14,
        fontSize: 13,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
        border: isUser ? 'none' : '1px solid #f3f4f6',
      }}
    >
      {displayText || (isUser ? '' : '...')}
      {!isUser && !isCaughtUp && (
        // Blinking cursor while typing
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: '#16a34a',
            verticalAlign: 'text-bottom',
            marginLeft: 2,
            animation: 'tready-cursor-blink 1s step-end infinite',
          }}
        />
      )}
      <style>{`
        @keyframes tready-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
