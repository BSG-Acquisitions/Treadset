/**
 * TreadyBubble — floating chat button + slide-out panel.
 *
 * Sits in the bottom-right of every authed page. Click to expand
 * into a chat surface that talks to the tready edge function.
 * Streams responses via @ai-sdk/react useChat. When Tready calls
 * the highlight_ui tool, dispatches a `tready:highlight` window
 * event that HighlightOverlay catches and renders.
 *
 * v5 useChat API: we manage input state ourselves and call
 * sendMessage(text) on submit. No legacy handleSubmit/handleInputChange
 * (those were the v3 API and are gone in @ai-sdk/react@^1.x).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const TREADY_ENDPOINT = `${SUPABASE_URL}/functions/v1/tready`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function TreadyBubble() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get a fresh JWT from the Supabase session
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

  // Build the transport whenever JWT or route changes. Adapts the v5
  // parts-based message format → our edge fn's simpler { role, content }
  // expectation. Keeps the backend contract stable across SDK upgrades.
  const transport = (
    accessToken
      ? new DefaultChatTransport({
          api: TREADY_ENDPOINT,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: ANON_KEY,
          },
          body: {
            session_id: sessionId,
            current_page: location.pathname,
          },
          prepareSendMessagesRequest: ({ messages, body }) => ({
            body: {
              ...body,
              messages: messages.map((m: any) => ({
                role: m.role,
                content:
                  m.parts
                    ?.filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join('') ?? m.content ?? '',
              })),
            },
          }),
        })
      : undefined
  ) as any;

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: ({ message }) => {
      // Scan the assistant message for highlight_ui tool outputs and
      // dispatch them to the HighlightOverlay component.
      const parts = (message as any)?.parts ?? [];
      for (const part of parts) {
        // v5 part types: tool-{toolName} (e.g., 'tool-highlight_ui')
        // Older shapes: type='tool-invocation' with toolInvocation.toolName
        const toolName =
          part.toolName ??
          part.toolInvocation?.toolName ??
          (typeof part.type === 'string' && part.type.startsWith('tool-')
            ? part.type.slice('tool-'.length)
            : undefined);
        if (toolName === 'highlight_ui') {
          const output = part.output ?? part.result ?? part.toolInvocation?.result;
          if (output?.highlighted) {
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
        }
      }
    },
  } as any);

  const isStreaming = status === 'submitted' || status === 'streaming';

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !accessToken || isStreaming) return;
      sendMessage({ text: input.trim() } as any);
      setInput('');
    },
    [input, accessToken, isStreaming, sendMessage],
  );

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  if (loading || !user) return null;

  return (
    <>
      {/* Floating bubble */}
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
          {/* Header */}
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
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
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
              <div
                style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: 13,
                  padding: '24px 12px',
                }}
              >
                <p style={{ margin: '0 0 8px', fontWeight: 500, color: '#111827' }}>
                  Hi {user.email?.split('@')[0]} — I'm Tready.
                </p>
                <p style={{ margin: 0 }}>
                  Ask me anything about TreadSet — how to do something, where it lives, or for live data on your operation.
                </p>
              </div>
            )}
            {messages.map((m: any) => (
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
                }}
              >
                <strong>Tready error:</strong> {String((error as any)?.message ?? error)}
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
              disabled={!accessToken || isStreaming}
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
              disabled={!input.trim() || isStreaming || !accessToken}
              style={{
                padding: '0 14px',
                borderRadius: 10,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: input.trim() && !isStreaming && accessToken ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isStreaming && accessToken ? 1 : 0.5,
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

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  const text =
    message.parts
      ?.filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('') ?? message.content ?? '';

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
      {text || (isUser ? '' : '...')}
    </div>
  );
}
