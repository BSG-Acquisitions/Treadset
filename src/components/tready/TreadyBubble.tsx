/**
 * TreadyBubble — floating chat button + slide-out panel.
 *
 * V1.6: voice (Web Speech API) + scripted "Take a tour" mode that
 * bypasses the LLM entirely to prove the visual primitives
 * (highlight + navigate + speak) work end-to-end.
 *
 * Implementation: hand-rolled SSE streaming via fetch. Bypasses
 * @ai-sdk/react's useChat entirely (the v5 hook captured transport
 * at first render and didn't propagate auth-token updates).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Volume2, VolumeX, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const TREADY_ENDPOINT = `${SUPABASE_URL}/functions/v1/tready`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const WELCOMED_KEY_PREFIX = 'tready_welcomed_';
const VOICE_PREF_KEY = 'tready_voice_enabled';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Voice helper — Web Speech API. Browser-native, free, instant.
// ============================================================================
function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.log('[Tready/voice] speechSynthesis not available');
      resolve();
      return;
    }
    if (!text.trim()) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel(); // stop any prior speech
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = opts.rate ?? 1.05;
    utt.pitch = 1.0;
    utt.volume = 0.95;
    // Pick a good voice if available (loaded async on first call)
    const voices = window.speechSynthesis.getVoices();
    const pref =
      voices.find((v) => v.name === 'Samantha') ||
      voices.find((v) => v.name === 'Alex') ||
      voices.find((v) => v.lang === 'en-US') ||
      voices[0];
    if (pref) utt.voice = pref;
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

function silence() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ============================================================================
// Scripted "welcome tour" — deterministic, no LLM. Proves the visual
// primitives work end-to-end. Each step does ONE thing then waits.
// ============================================================================
type TourStep =
  | { kind: 'speak'; text: string; wait?: number }
  | { kind: 'highlight'; element_id: string; caption?: string; waitForClick?: boolean; wait?: number }
  | { kind: 'navigate'; path: string; wait?: number }
  | { kind: 'pause'; ms: number };

const WELCOME_TOUR: TourStep[] = [
  { kind: 'speak', text: "Welcome to TreadSet. I'm Tready, your AI ops copilot. Let me show you around — should take about ninety seconds.", wait: 200 },
  { kind: 'highlight', element_id: 'sidebar-dashboard', caption: 'Your dashboard — today\'s tire counts and pickups live here.', wait: 4500 },
  { kind: 'speak', text: 'Up next: how to add a client.', wait: 100 },
  { kind: 'pause', ms: 1500 },
  { kind: 'navigate', path: '/clients', wait: 1500 },
  { kind: 'highlight', element_id: 'clients-add-button', caption: 'This is the Add Client button — click it when you have a new business to add.', waitForClick: false, wait: 5000 },
  { kind: 'speak', text: 'When you click it, a form opens — company name, contact, address. Submit and you\'re done.', wait: 100 },
  { kind: 'pause', ms: 5500 },
  { kind: 'navigate', path: '/dashboard', wait: 1500 },
  { kind: 'highlight', element_id: 'topnav-user-menu', caption: 'Your profile and sign-out live up here.', wait: 4000 },
  { kind: 'speak', text: "That's the basics. Tap me anytime — ask anything, or I'll walk you through any flow step by step.", wait: 100 },
];

async function runTour(
  steps: TourStep[],
  navigate: (path: string) => void,
  voiceOn: boolean,
  setRunning: (b: boolean) => void,
) {
  setRunning(true);
  for (const step of steps) {
    if (step.kind === 'speak') {
      if (voiceOn) await speak(step.text);
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
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
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    const v = localStorage.getItem(VOICE_PREF_KEY);
    return v === null ? true : v === '1';
  });
  const [tourRunning, setTourRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist voice toggle
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_PREF_KEY, voiceOn ? '1' : '0');
    }
  }, [voiceOn]);

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

  // Cancel speech when bubble closes or unmounts
  useEffect(() => () => silence(), []);
  useEffect(() => {
    if (!isOpen) silence();
  }, [isOpen]);

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
        // Speak the full assistant message after the stream completes
        if (voiceOn && assistantText.trim()) {
          void speak(assistantText);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Tready/req] error:', msg);
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content));
      } finally {
        setIsStreaming(false);
      }
    },
    [accessToken, sessionId, location.pathname, messages, voiceOn],
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
    void runTour(WELCOME_TOUR, navigate, voiceOn, setTourRunning);
  }, [navigate, voiceOn]);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const toggleVoice = useCallback(() => setVoiceOn((v) => !v), []);

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
                onClick={toggleVoice}
                aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
                title={voiceOn ? 'Voice ON — click to mute' : 'Voice OFF — click to unmute'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
              >
                {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
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
                    AI copilot for TreadSet. Speaks, points, and walks you through anything.
                  </p>
                </div>

                {/* The headline CTA — scripted tour */}
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
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                  }}
                >
                  <Play size={16} fill="#fff" />
                  {tourRunning ? 'Tour running…' : 'Take the 90-second tour'}
                </button>

                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 0 0 4px' }}>
                  Or ask me
                </div>
                {[
                  'Show me how to add a client',
                  "What's on my dashboard today?",
                  'Walk me through signing a manifest',
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
