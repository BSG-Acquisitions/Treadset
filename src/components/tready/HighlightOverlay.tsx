/**
 * HighlightOverlay — Tready's floating speech-bubble + visual highlight.
 *
 * Tready feels like a character that moves around the page guiding the
 * user. When highlight events fire, the green ring lands on the target
 * AND a Tready speech bubble pops up next to it (auto-positioned to
 * avoid covering the element). Smooth spring transitions when moving
 * between highlights — like a friendly assistant floating from one
 * thing to the next.
 *
 * Listens for:
 *   - tready:highlight   { element_id, caption?, wait_for_click? }
 *   - tready:clear-highlight (no detail)
 *
 * Fires:
 *   - tready:step-complete  when user clicks a wait_for_click target
 *
 * Smart positioning: tries BOTTOM → TOP → RIGHT → LEFT and picks the
 * first side that fits in the viewport with the bubble fully visible.
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
const RING_PADDING = 6;
const BUBBLE_GAP = 18;
const BUBBLE_MAX_WIDTH = 320;
const BUBBLE_ESTIMATED_HEIGHT = 88;
const VIEWPORT_PAD = 12;

type BubblePosition = {
  side: 'top' | 'bottom' | 'left' | 'right';
  left: number;
  top: number;
  arrowLeft: number;
  arrowTop: number;
};

function computeBubblePosition(rect: DOMRect): BubblePosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;

  // Try positions in priority order — first one that fits wins.
  const tryPositions: Array<{ side: BubblePosition['side']; left: number; top: number }> = [
    // BOTTOM (preferred for top-nav highlights)
    { side: 'bottom', left: targetCenterX - BUBBLE_MAX_WIDTH / 2, top: rect.bottom + BUBBLE_GAP },
    // TOP
    { side: 'top', left: targetCenterX - BUBBLE_MAX_WIDTH / 2, top: rect.top - BUBBLE_GAP - BUBBLE_ESTIMATED_HEIGHT },
    // RIGHT
    { side: 'right', left: rect.right + BUBBLE_GAP, top: targetCenterY - BUBBLE_ESTIMATED_HEIGHT / 2 },
    // LEFT
    { side: 'left', left: rect.left - BUBBLE_GAP - BUBBLE_MAX_WIDTH, top: targetCenterY - BUBBLE_ESTIMATED_HEIGHT / 2 },
  ];

  for (const opt of tryPositions) {
    const fitsX = opt.left >= VIEWPORT_PAD && opt.left + BUBBLE_MAX_WIDTH <= vw - VIEWPORT_PAD;
    const fitsY = opt.top >= VIEWPORT_PAD && opt.top + BUBBLE_ESTIMATED_HEIGHT <= vh - VIEWPORT_PAD;
    if (fitsX && fitsY) {
      let arrowLeft = 0;
      let arrowTop = 0;
      if (opt.side === 'bottom' || opt.side === 'top') {
        arrowLeft = Math.max(20, Math.min(BUBBLE_MAX_WIDTH - 20, targetCenterX - opt.left));
        arrowTop = opt.side === 'bottom' ? -8 : BUBBLE_ESTIMATED_HEIGHT;
      } else {
        arrowTop = Math.max(20, Math.min(BUBBLE_ESTIMATED_HEIGHT - 20, targetCenterY - opt.top));
        arrowLeft = opt.side === 'right' ? -8 : BUBBLE_MAX_WIDTH;
      }
      return { ...opt, arrowLeft, arrowTop };
    }
  }
  // Fallback — center bottom of viewport
  return {
    side: 'bottom',
    left: vw / 2 - BUBBLE_MAX_WIDTH / 2,
    top: vh - BUBBLE_ESTIMATED_HEIGHT - 100,
    arrowLeft: BUBBLE_MAX_WIDTH / 2,
    arrowTop: -8,
  };
}

export function HighlightOverlay() {
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [bubblePos, setBubblePos] = useState<BubblePosition | null>(null);

  const dismiss = useCallback(() => {
    setHighlight(null);
    setBubblePos(null);
  }, []);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!highlight) return;
    const recompute = () => {
      const el = document.querySelector(`[data-tready-id="${highlight.payload.element_id}"]`);
      if (!el) {
        setHighlight(null);
        setBubblePos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setHighlight((prev) => (prev ? { ...prev, rect } : null));
      setBubblePos(computeBubblePosition(rect));
    };
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [highlight?.payload.element_id]);

  // Subscribe to highlight requests from Tready chat / scripted tour
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const detail = (e as CustomEvent<HighlightPayload>).detail;
      if (!detail?.element_id) return;

      const el = document.querySelector(`[data-tready-id="${detail.element_id}"]`);
      if (!el) {
        console.warn('[Tready] highlight target not found in DOM:', detail.element_id);
        return;
      }
      const rect = el.getBoundingClientRect();

      // Scroll into view if needed, then position
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const r2 = el.getBoundingClientRect();
          setHighlight({ payload: detail, rect: r2 });
          setBubblePos(computeBubblePosition(r2));
        }, 350);
      } else {
        setHighlight({ payload: detail, rect });
        setBubblePos(computeBubblePosition(rect));
      }

      if (detail.wait_for_click) {
        const onClick = () => {
          window.dispatchEvent(
            new CustomEvent('tready:step-complete', { detail: { element_id: detail.element_id } }),
          );
          el.removeEventListener('click', onClick);
          setHighlight(null);
          setBubblePos(null);
        };
        el.addEventListener('click', onClick, { once: true });
      } else {
        setTimeout(() => {
          setHighlight((prev) => (prev?.payload.element_id === detail.element_id ? null : prev));
          setBubblePos((prev) => (prev ? null : prev));
        }, AUTO_DISMISS_MS);
      }
    };

    const onClear = () => {
      setHighlight(null);
      setBubblePos(null);
    };

    window.addEventListener('tready:highlight', onHighlight as EventListener);
    window.addEventListener('tready:clear-highlight', onClear);
    return () => {
      window.removeEventListener('tready:highlight', onHighlight as EventListener);
      window.removeEventListener('tready:clear-highlight', onClear);
    };
  }, []);

  if (!highlight) return null;

  const { rect, payload } = highlight;

  return (
    <>
      {/* Pulsing green ring around the target */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: rect.left - RING_PADDING,
          top: rect.top - RING_PADDING,
          width: rect.width + RING_PADDING * 2,
          height: rect.height + RING_PADDING * 2,
          borderRadius: 12,
          border: '3px solid #16a34a',
          boxShadow: '0 0 0 4px rgba(22, 163, 74, 0.25), 0 0 20px rgba(22, 163, 74, 0.55)',
          pointerEvents: 'none',
          zIndex: 100001,
          animation: 'tready-pulse 1.4s ease-in-out infinite',
          transition: 'all 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      {/* Tready speech bubble — auto-positioned, springy */}
      {bubblePos && payload.caption && (
        <div
          style={{
            position: 'fixed',
            left: bubblePos.left,
            top: bubblePos.top,
            width: BUBBLE_MAX_WIDTH,
            zIndex: 100002,
            pointerEvents: 'auto',
            transition: 'left 380ms cubic-bezier(0.34, 1.56, 0.64, 1), top 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            animation: 'tready-bubble-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Arrow / pointer */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: bubblePos.arrowLeft - 8,
              top: bubblePos.arrowTop,
              width: 16,
              height: 16,
              background: '#0f172a',
              transform: 'rotate(45deg)',
              borderRadius: 2,
              zIndex: -1,
            }}
          />
          {/* Bubble body */}
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.45,
              fontWeight: 500,
              boxShadow: '0 12px 32px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            {/* Tready avatar — bobs subtly to feel alive */}
            <div
              style={{
                width: 28,
                height: 28,
                minWidth: 28,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 2px 6px rgba(22,163,74,0.4)',
                animation: 'tready-avatar-bob 2.2s ease-in-out infinite',
                flexShrink: 0,
              }}
            >
              T
            </div>
            <div style={{ flex: 1 }}>
              <div>{payload.caption}</div>
              {payload.wait_for_click && (
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4, fontStyle: 'italic' }}>
                  → tap the green-ringed thing to continue
                </div>
              )}
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 0,
                fontSize: 18,
                lineHeight: 1,
                marginLeft: 4,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes tready-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.25), 0 0 20px rgba(22, 163, 74, 0.45); }
          50%      { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.18), 0 0 32px rgba(22, 163, 74, 0.75); }
        }
        @keyframes tready-bubble-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes tready-avatar-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
      `}</style>
    </>
  );
}
