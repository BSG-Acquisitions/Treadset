/**
 * HighlightOverlay — visually highlights a UI element when Tready
 * tells it to.
 *
 * Listens for `tready:highlight` window events. Each event carries
 * the data-tready-id of the target element + an optional caption.
 * The overlay queries the DOM for that element, computes its bounding
 * rect, and renders a pulsing green ring + caption tooltip absolutely
 * positioned over the element.
 *
 * If `wait_for_click` is true, the overlay stays until the user
 * clicks the highlighted element (fires `tready:step-complete` event
 * for the chat to consume). If false, auto-dismisses after 8 seconds.
 *
 * Architecture: pure DOM querying. No need for refs or React tree
 * coordination — every interactive element across TreadSet has been
 * tagged with `data-tready-id`, so this overlay is decoupled from
 * any specific component.
 */
import { useEffect, useState, useCallback } from 'react';

interface HighlightPayload {
  element_id: string;
  caption?: string;
  wait_for_click?: boolean;
}

interface HighlightState {
  payload: HighlightPayload;
  rect: DOMRect;
}

const AUTO_DISMISS_MS = 8000;

export function HighlightOverlay() {
  const [highlight, setHighlight] = useState<HighlightState | null>(null);

  const dismiss = useCallback(() => {
    setHighlight(null);
  }, []);

  // Recompute target rect on scroll / resize so the ring tracks the element
  useEffect(() => {
    if (!highlight) return;

    const recompute = () => {
      const el = document.querySelector(`[data-tready-id="${highlight.payload.element_id}"]`);
      if (!el) {
        setHighlight(null); // element disappeared
        return;
      }
      const rect = el.getBoundingClientRect();
      setHighlight((prev) => (prev ? { ...prev, rect } : null));
    };

    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [highlight?.payload.element_id]);

  // Subscribe to highlight requests from Tready chat
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const detail = (e as CustomEvent<HighlightPayload>).detail;
      if (!detail?.element_id) return;

      const el = document.querySelector(`[data-tready-id="${detail.element_id}"]`);
      if (!el) {
        // No matching element — Tready will see step never completed and can fall back verbally
        console.warn('[Tready] highlight target not found in DOM:', detail.element_id);
        return;
      }
      const rect = el.getBoundingClientRect();

      // Scroll the element into view if needed
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setHighlight({ payload: detail, rect: el.getBoundingClientRect() });

      // If wait_for_click is true, listen for actual clicks on the target
      if (detail.wait_for_click) {
        const onClick = () => {
          window.dispatchEvent(
            new CustomEvent('tready:step-complete', { detail: { element_id: detail.element_id } }),
          );
          el.removeEventListener('click', onClick);
          setHighlight(null);
        };
        el.addEventListener('click', onClick, { once: true });
      } else {
        // Auto-dismiss after a few seconds for non-blocking highlights
        setTimeout(() => {
          setHighlight((prev) => (prev?.payload.element_id === detail.element_id ? null : prev));
        }, AUTO_DISMISS_MS);
      }
    };

    const onClear = () => setHighlight(null);

    window.addEventListener('tready:highlight', onHighlight as EventListener);
    window.addEventListener('tready:clear-highlight', onClear);
    return () => {
      window.removeEventListener('tready:highlight', onHighlight as EventListener);
      window.removeEventListener('tready:clear-highlight', onClear);
    };
  }, []);

  if (!highlight) return null;

  const { rect, payload } = highlight;
  const padding = 6;

  // Caption position: above the element if there's room, else below
  const captionAbove = rect.top > 80;
  const captionStyle: React.CSSProperties = {
    position: 'fixed',
    left: rect.left + rect.width / 2,
    top: captionAbove ? rect.top - 12 : rect.bottom + 12,
    transform: captionAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    zIndex: 100002,
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Pulsing ring around the target element */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          borderRadius: 12,
          border: '3px solid #16a34a', // tailwind green-600
          boxShadow: '0 0 0 4px rgba(22, 163, 74, 0.25), 0 0 20px rgba(22, 163, 74, 0.55)',
          pointerEvents: 'none',
          zIndex: 100001,
          animation: 'tready-pulse 1.4s ease-in-out infinite',
          transition: 'all 220ms ease-out',
        }}
      />
      {/* Caption tooltip */}
      {payload.caption && (
        <div style={captionStyle}>
          <div
            style={{
              background: '#0f172a', // tailwind slate-900
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.35,
              fontWeight: 500,
              maxWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              whiteSpace: 'normal',
              textAlign: 'center',
            }}
          >
            {payload.caption}
            {payload.wait_for_click && (
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                (click to continue)
              </div>
            )}
          </div>
        </div>
      )}
      {/* Inject keyframes once */}
      <style>{`
        @keyframes tready-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.25), 0 0 20px rgba(22, 163, 74, 0.45); }
          50%      { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.18), 0 0 32px rgba(22, 163, 74, 0.75); }
        }
      `}</style>
      {/* Dismiss button (top-right of ring) */}
      <button
        onClick={dismiss}
        aria-label="Dismiss highlight"
        style={{
          position: 'fixed',
          left: rect.right + padding,
          top: rect.top - padding - 22,
          width: 22,
          height: 22,
          borderRadius: 11,
          border: 'none',
          background: '#16a34a',
          color: '#fff',
          fontSize: 14,
          lineHeight: '20px',
          cursor: 'pointer',
          zIndex: 100003,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        ×
      </button>
    </>
  );
}
