/**
 * TreadyBubble — floating chat button + slide-out panel.
 *
 * Sits in the bottom-right of every authed page. Click to expand
 * into a chat surface that talks to the tready edge function.
 *
 * Implementation: hand-rolled SSE streaming via fetch. Bypasses
 * @ai-sdk/react's useChat entirely — that hook's transport prop
 * gets captured at first render, so when accessToken arrives async
 * after mount, the chat instance is stuck with a stale (undefined)
 * transport. Rolling our own avoids the whole class of bugs.
 *
 * Reads SSE events of shape `data: {json}\n\n` from the edge fn,
 * parses text-delta events into the streaming assistant message,
 * and parses tool-output-available for highlight_ui → dispatches
 * `tready:highlight` events that HighlightOverlay catches.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const TREADY_ENDPOINT = `${SUPABASE_URL}/functions/v1/tready`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Localstorage flag so the welcome auto-launch only fires once per
// (user, browser). Cleared if the user clears site data.
const WELCOMED_KEY_PREFIX = 'tready_welcomed_';

// Suggestion chips shown in the empty state. Click → sends as user message.
const WELCOME_SUGGESTIONS = [
  'Show me how to add a client',
  "What's on my dashboard today?",
  'Walk me through signing a manifest',
];

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // First-login auto-open: when the user lands and we haven't welcomed
  // them yet, pop Tready open after a short delay so the page can finish
  // loading first. The chips in the empty state are the welcome.
  useEffect(() => {
    if (loading || !user) return;
    const key = WELCOMED_KEY_PREFIX + user.id;
    if (localStorage.getItem(key)) return; // already welcomed
    const t = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(key, new Date().toISOString());
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, user]);

  // Listen for tready:navigate events from the navigate_to tool and
  // route the user via react-router.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string; reason?: string }>).detail;
      if (!detail?.path) return;
      // Don't navigate if already on that path
      if (detail.path === location.pathname) return;
      navigate(detail.path);
    };
    window.addEventListener('tready:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('tready:navigate', onNavigate as EventListener);
  }, [navigate, location.pathname]);

  // Fetch + watch the JWT
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

  const sendMessage = useCallback(
    async (text: string) => {
      if (!accessToken) {
        setError('Not authenticated yet — wait a moment and try again.');
        return;
      }
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const assistantId = crypto.randomUUID();

      // Snapshot the conversation BEFORE adding the user message —
      // that's what gets sent to the edge fn (history + new user turn).
      const conversation = messages.map((m) => ({ role: m.role, content: m.content }));
      conversation.push({ role: 'user', content: text });

      // Optimistically render user message + empty assistant placeholder
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
      setIsStreaming(true);
      setError(null);

      try {
        console.log('[Tready] sending', { sessionId, currentPage: location.pathname, turns: conversation.length });
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

        console.log('[Tready] response', { status: response.status, contentType: response.headers.get('content-type') });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
        }
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events. Each event is "data: {json}\n\n" possibly
          // split across chunks — accumulate in buffer and split on
          // double-newline boundaries.
          let nlIdx;
          while ((nlIdx = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 2);

            // Each event may have multiple "data: ..." lines (rare); join them
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

            // Handle the event types we care about
            if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
              assistantText += evt.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
              );
            } else if (evt.type === 'tool-output-available' && evt.toolName === 'highlight_ui') {
              const output = evt.output;
              if (output?.highlighted) {
                console.log('[Tready] highlight', output);
                window.dispatchEvent(
                  new CustomEvent('tready:highlight', {
                    detail: {
                      element_id: output.element_id,
                      caption: output.caption,
                      wait_for_click: output.wait_for_click,
                    },
                  }),
                );
              }
            } else if (evt.type === 'tool-output-available' && evt.toolName === 'navigate_to') {
              const output = evt.output;
              if (output?.navigated_to) {
                console.log('[Tready] navigate', output);
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

        console.log('[Tready] stream done. final text length:', assistantText.length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Tready] error:', msg);
        setError(msg);
        // Remove the empty assistant placeholder we added optimistically
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

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  if (loading || !user) return null;

  return (
    <>
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
          boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35), 0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90000,
          transition: 'transform 160ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Tready chat"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 88,
            width: 380,
            height: 540,
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
          <div
            style={{
              padding: '14px 18px',
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
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400 }}>
                Your TreadSet AI copilot
              </div>
            </div>
            <button
              onClick={toggle}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 4px' }}>
                <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '8px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                    <Sparkles size={16} color="#16a34a" />
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>
                      Hi {user.email?.split('@')[0]} — I'm Tready
                    </p>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Your AI ops copilot for TreadSet. Ask me anything — I'll answer, point you at the right buttons, or walk you through any flow step-by-step.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                    Try one of these
                  </div>
                  {WELCOME_SUGGESTIONS.map((s) => (
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
                      {s}
                    </button>
                  ))}
                </div>
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
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
      {message.content || (isUser ? '' : '...')}
    </div>
  );
}
