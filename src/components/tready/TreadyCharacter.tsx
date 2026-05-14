/**
 * TreadyCharacter — the animated face of Tready.
 *
 * v1 (2026-05-14): self-contained SVG body with 5 states, organic morph,
 * eye-target tracking, speech bubble. No app awareness, no tour engine
 * dependencies, no AI. Pure presentational. Drive it via the `state`,
 * `speechText`, and `target` props.
 *
 * Visual brief:
 *   - Tire torus (tread + hole) at rest
 *   - Morphs to a solid gooey blob when thinking / pointing
 *   - Big Pixar-ish eyes that blink + glance + track a target
 *   - Subtle puffer-jacket suggestion on the lower body (3 segments)
 *   - Speech bubble appears next to the body in talking state
 *
 * Pointer events: the bounding wrapper is `pointer-events: none`; only the
 * body + speech bubble are interactive so clicks pass through to the app.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';

export type TreadyState = 'idle' | 'thinking' | 'talking' | 'pointing' | 'hidden';
export type TreadyTarget =
  | { x: number; y: number }
  | React.RefObject<HTMLElement | null>;

export interface TreadyCharacterProps {
  state?: TreadyState;
  speechText?: string;
  target?: TreadyTarget;
  /** Body diameter in px. Default 120. */
  size?: number;
  /** Squish factor 0–1: how much the body morphs at rest. Default 0.35. */
  squish?: number;
  /** Breathe / wobble cycle in seconds. Default 5. */
  wobbleCycle?: number;
  /** Tire rubber color. Default near-black hsl(24,10%,22%). */
  rubberColor?: string;
  /** Puffer jacket color. Default classic puffer blue hsl(212,70%,52%). */
  jacketColor?: string;
  /** Fixed-position anchors. Default { right: 20, bottom: 20 }. */
  position?: { right?: number; bottom?: number; left?: number; top?: number };
  /** Optional click handler on the character body. */
  onClick?: () => void;
  /** Aria label for the body button. */
  ariaLabel?: string;
}

const DEFAULTS = {
  size: 120,
  squish: 0.35,
  wobbleCycle: 5,
  rubberColor: 'hsl(24, 10%, 22%)',
  jacketColor: 'hsl(212, 70%, 52%)',
  position: { right: 20, bottom: 20 },
};

// Framer spring for state morph values. No hard cuts.
const STATE_SPRING: Transition = { type: 'spring', stiffness: 200, damping: 22, mass: 0.7 };

export function TreadyCharacter({
  state = 'idle',
  speechText,
  target,
  size = DEFAULTS.size,
  squish = DEFAULTS.squish,
  wobbleCycle = DEFAULTS.wobbleCycle,
  rubberColor = DEFAULTS.rubberColor,
  jacketColor = DEFAULTS.jacketColor,
  position = DEFAULTS.position,
  onClick,
  ariaLabel = 'Tready',
}: TreadyCharacterProps) {
  const uid = useId().replace(/:/g, '');
  const bodyRef = useRef<HTMLButtonElement | null>(null);

  // ============================================================================
  // Eye target tracking — rAF loop. Pupils interpolate toward the resolved
  // target coordinates relative to the character's screen center.
  // ============================================================================
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const pupilRef = useRef({ x: 0, y: 0 });
  const glanceRef = useRef({ x: 0, y: 0 });

  // Random idle glance every 1–3s
  useEffect(() => {
    if (state === 'hidden') return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      // Pointing state takes its cue from `target`, not from random glances.
      if (state !== 'pointing') {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.6; // 0–60% of max pupil travel
        glanceRef.current = { x: Math.cos(a) * r, y: Math.sin(a) * r };
      } else {
        glanceRef.current = { x: 0, y: 0 };
      }
      const next = 1000 + Math.random() * 2000;
      window.setTimeout(tick, next);
    };
    const t = window.setTimeout(tick, 600 + Math.random() * 1000);
    return () => {
      stopped = true;
      window.clearTimeout(t);
    };
  }, [state]);

  // rAF: interpolate pupil toward the target (or the idle glance if no target)
  useEffect(() => {
    if (state === 'hidden') return;
    let raf = 0;
    const loop = () => {
      const bodyEl = bodyRef.current;
      let desired = { ...glanceRef.current }; // base: idle glance vector (-1..1)
      if (state === 'pointing' && target && bodyEl) {
        const rect = bodyEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let tx: number | null = null;
        let ty: number | null = null;
        if ('x' in target && 'y' in target) {
          tx = target.x;
          ty = target.y;
        } else if (target.current) {
          const r = target.current.getBoundingClientRect();
          tx = r.left + r.width / 2;
          ty = r.top + r.height / 2;
        }
        if (tx != null && ty != null) {
          const dx = tx - cx;
          const dy = ty - cy;
          const dist = Math.hypot(dx, dy);
          if (dist > 1) {
            // Normalize and damp — never let pupils touch the eye edge.
            const k = Math.min(1, dist / 200);
            desired = { x: (dx / dist) * k, y: (dy / dist) * k };
          }
        }
      }
      // Lerp ~0.18 per frame
      pupilRef.current = {
        x: pupilRef.current.x + (desired.x - pupilRef.current.x) * 0.18,
        y: pupilRef.current.y + (desired.y - pupilRef.current.y) * 0.18,
      };
      setPupil({ x: pupilRef.current.x, y: pupilRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, target]);

  // ============================================================================
  // Blink — random interval 2–5s, scaleY collapse for ~120ms
  // ============================================================================
  const [blinkOn, setBlinkOn] = useState(false);
  useEffect(() => {
    if (state === 'hidden') return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      setBlinkOn(true);
      window.setTimeout(() => {
        if (stopped) return;
        setBlinkOn(false);
        const next = 2000 + Math.random() * 3000;
        window.setTimeout(tick, next);
      }, 120);
    };
    const t = window.setTimeout(tick, 1500 + Math.random() * 2000);
    return () => {
      stopped = true;
      window.clearTimeout(t);
    };
  }, [state]);

  // ============================================================================
  // State-driven morph values (tire ↔ blob, glow, lean)
  // ============================================================================
  const isActive = state === 'thinking' || state === 'pointing';
  // Hole radius: open at rest, closed when active.
  const holeRatio = isActive ? 0 : 0.32;
  // Treads fade out when active.
  const treadOpacity = isActive ? 0 : 1;
  // Body radius oscillates slightly off-perfect on blob form for organic feel.
  const blobBorderRadius = isActive ? `50% 48% 52% 50% / 49% 51% 49% 51%` : `50%`;
  // Lean vector (for pointing) — derived from pupil.
  const leanX = state === 'pointing' ? pupil.x * 6 : 0;
  const leanY = state === 'pointing' ? pupil.y * 4 : 0;

  // ============================================================================
  // State-level Framer variants
  // ============================================================================
  const wrapperVariants = {
    idle: {
      opacity: 1,
      scale: 1,
      filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))',
      transition: STATE_SPRING,
    },
    thinking: {
      opacity: 1,
      scale: 1,
      filter: `drop-shadow(0 0 14px ${jacketColor.replace('52%', '62%')})`,
      transition: STATE_SPRING,
    },
    talking: {
      opacity: 1,
      scale: 1,
      filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))',
      transition: STATE_SPRING,
    },
    pointing: {
      opacity: 1,
      scale: 1,
      filter: `drop-shadow(0 0 12px ${jacketColor.replace('52%', '60%')})`,
      transition: STATE_SPRING,
    },
    hidden: {
      opacity: 0,
      scale: 0.85,
      filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))',
      transition: { ...STATE_SPRING, stiffness: 260 },
    },
  } as const;

  // Per-state breathing loop applied via a child motion.div.
  const breatheAnim = (() => {
    if (state === 'idle') return { scale: [1, 1 + squish * 0.08, 1] };
    if (state === 'thinking') return { scale: [1, 1.05, 1] };
    if (state === 'talking') return { scale: [1, 1.02, 1] };
    if (state === 'pointing') return { scale: [1, 1.03, 1] };
    return { scale: 1 };
  })();
  const breatheDur = (() => {
    if (state === 'idle') return wobbleCycle;
    if (state === 'thinking') return 1.5;
    if (state === 'talking') return 2.5;
    if (state === 'pointing') return 2.2;
    return 0;
  })();

  // Y-drift for idle, soft bob toward viewer for talking.
  const driftAnim = (() => {
    if (state === 'idle') return { y: [0, -3, 0, 3, 0] };
    if (state === 'talking') return { y: [0, -4, 0] };
    return { y: 0 };
  })();
  const driftDur = state === 'idle' ? wobbleCycle * 1.4 : 2.4;

  // ============================================================================
  // Render
  // ============================================================================
  const halfSize = size / 2;
  const treadCount = 16;

  const handleClick = useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  return (
    <div
      aria-hidden={state === 'hidden'}
      style={{
        position: 'fixed',
        right: position.right,
        bottom: position.bottom,
        left: position.left,
        top: position.top,
        width: size,
        height: size,
        pointerEvents: 'none', // wrapper passes clicks through
        zIndex: 90000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence>
        {state !== 'hidden' && (
          <motion.div
            key="character"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={state}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.28 } }}
            variants={wrapperVariants as never}
            style={{
              position: 'relative',
              width: size,
              height: size,
              transformOrigin: 'center center',
            }}
          >
            {/* Drift layer: gentle vertical wander */}
            <motion.div
              animate={driftAnim}
              transition={{ duration: driftDur, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: size, height: size, position: 'relative' }}
            >
              {/* Breathing layer: scale pulse, plus the lean for pointing */}
              <motion.div
                animate={{
                  ...breatheAnim,
                  x: leanX,
                  y: leanY,
                  borderRadius: blobBorderRadius,
                }}
                transition={{
                  scale: { duration: breatheDur, repeat: Infinity, ease: 'easeInOut' },
                  x: { type: 'spring', stiffness: 180, damping: 18 },
                  y: { type: 'spring', stiffness: 180, damping: 18 },
                  borderRadius: { duration: 0.6, ease: 'easeInOut' },
                }}
                onClick={handleClick}
                role={onClick ? 'button' : undefined}
                aria-label={ariaLabel}
                ref={bodyRef as never}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'auto',
                  cursor: onClick ? 'pointer' : 'default',
                  borderRadius: blobBorderRadius,
                  overflow: 'visible',
                }}
              >
                <svg
                  viewBox={`0 0 ${size} ${size}`}
                  width={size}
                  height={size}
                  style={{ display: 'block', overflow: 'visible' }}
                >
                  <defs>
                    <radialGradient id={`tready-body-${uid}`} cx="50%" cy="42%" r="58%">
                      <stop offset="0%" stopColor={shade(rubberColor, 10)} />
                      <stop offset="100%" stopColor={rubberColor} />
                    </radialGradient>
                    <linearGradient id={`tready-jacket-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={shade(jacketColor, 12)} />
                      <stop offset="100%" stopColor={shade(jacketColor, -8)} />
                    </linearGradient>
                    <filter id={`tready-puff-${uid}`}>
                      <feGaussianBlur stdDeviation="0.6" />
                    </filter>
                  </defs>

                  {/* Body — outer rubber */}
                  <motion.circle
                    cx={halfSize}
                    cy={halfSize}
                    r={halfSize - 2}
                    fill={`url(#tready-body-${uid})`}
                    animate={{ r: halfSize - 2 }}
                    transition={STATE_SPRING}
                  />

                  {/* Tread strips around the rim */}
                  <g style={{ transition: 'opacity 360ms ease', opacity: treadOpacity }}>
                    {Array.from({ length: treadCount }).map((_, i) => {
                      const a = (i / treadCount) * Math.PI * 2;
                      const rOuter = halfSize - 4;
                      const rInner = halfSize - 13;
                      const x1 = halfSize + Math.cos(a) * rInner;
                      const y1 = halfSize + Math.sin(a) * rInner;
                      const x2 = halfSize + Math.cos(a) * rOuter;
                      const y2 = halfSize + Math.sin(a) * rOuter;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={shade(rubberColor, -10)}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </g>

                  {/* Hole — animated open/closed for tire ↔ blob morph */}
                  <motion.circle
                    cx={halfSize}
                    cy={halfSize}
                    r={halfSize * holeRatio}
                    fill="rgba(0,0,0,0.55)"
                    animate={{ r: halfSize * holeRatio }}
                    transition={STATE_SPRING}
                  />

                  {/* Puffer jacket — 3 segments on lower 30%, with collar arc */}
                  <g filter={`url(#tready-puff-${uid})`}>
                    <ellipse
                      cx={halfSize}
                      cy={halfSize + size * 0.18}
                      rx={size * 0.36}
                      ry={size * 0.11}
                      fill={`url(#tready-jacket-${uid})`}
                    />
                    <ellipse
                      cx={halfSize - size * 0.16}
                      cy={halfSize + size * 0.27}
                      rx={size * 0.18}
                      ry={size * 0.08}
                      fill={`url(#tready-jacket-${uid})`}
                    />
                    <ellipse
                      cx={halfSize + size * 0.16}
                      cy={halfSize + size * 0.27}
                      rx={size * 0.18}
                      ry={size * 0.08}
                      fill={`url(#tready-jacket-${uid})`}
                    />
                  </g>
                  {/* Quilt seams — thin diagonal accents */}
                  <g stroke={shade(jacketColor, -22)} strokeWidth={1.1} opacity={0.5}>
                    <line x1={halfSize} y1={halfSize + size * 0.1} x2={halfSize} y2={halfSize + size * 0.28} />
                    <line
                      x1={halfSize - size * 0.16}
                      y1={halfSize + size * 0.22}
                      x2={halfSize - size * 0.16}
                      y2={halfSize + size * 0.32}
                    />
                    <line
                      x1={halfSize + size * 0.16}
                      y1={halfSize + size * 0.22}
                      x2={halfSize + size * 0.16}
                      y2={halfSize + size * 0.32}
                    />
                  </g>
                  {/* Small collar arc */}
                  <path
                    d={`M ${halfSize - size * 0.18} ${halfSize + size * 0.05}
                        Q ${halfSize} ${halfSize - size * 0.02}
                        ${halfSize + size * 0.18} ${halfSize + size * 0.05}`}
                    fill="none"
                    stroke={shade(jacketColor, -10)}
                    strokeWidth={size * 0.045}
                    strokeLinecap="round"
                  />

                  {/* Eyes — big, expressive, with pupil tracking + blink */}
                  <Eyes
                    halfSize={halfSize}
                    size={size}
                    pupil={pupil}
                    blink={blinkOn}
                    isActive={isActive}
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* Speech bubble — appears in talking state */}
            <AnimatePresence>
              {state === 'talking' && speechText && (
                <SpeechBubble text={speechText} size={size} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Eyes subcomponent
// ============================================================================
function Eyes({
  halfSize,
  size,
  pupil,
  blink,
  isActive,
}: {
  halfSize: number;
  size: number;
  pupil: { x: number; y: number };
  blink: boolean;
  isActive: boolean;
}) {
  // Eye geometry (relative to body center). When in active/blob form, eyes
  // sit slightly higher so the body bulges below them.
  const eyeY = halfSize - size * (isActive ? 0.15 : 0.12);
  const eyeDx = size * 0.18;
  const eyeR = size * 0.13;
  const pupilR = size * 0.06;
  const maxPupilOffset = eyeR - pupilR - 2;
  const px = pupil.x * maxPupilOffset;
  const py = pupil.y * maxPupilOffset;
  const eyeScaleY = blink ? 0.05 : 1;

  return (
    <g style={{ transition: 'transform 120ms ease' }}>
      {[-1, 1].map((side) => (
        <g
          key={side}
          transform={`translate(${halfSize + side * eyeDx} ${eyeY}) scale(1 ${eyeScaleY})`}
        >
          {/* White */}
          <circle cx={0} cy={0} r={eyeR} fill="#ffffff" />
          {/* Pupil */}
          <circle cx={px} cy={py} r={pupilR} fill="#0c0d10" />
          {/* Catch-light */}
          <circle
            cx={px - pupilR * 0.35}
            cy={py - pupilR * 0.45}
            r={pupilR * 0.32}
            fill="#ffffff"
            opacity={0.9}
          />
        </g>
      ))}
    </g>
  );
}

// ============================================================================
// Speech bubble — positioned to the upper-left of the character
// ============================================================================
function SpeechBubble({ text, size }: { text: string; size: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'absolute',
        right: size + 12,
        bottom: size * 0.55,
        maxWidth: 280,
        minWidth: 120,
        background: '#ffffff',
        color: '#111827',
        borderRadius: 14,
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.4,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        pointerEvents: 'auto',
      }}
    >
      {text}
      {/* Tail pointing at the character */}
      <div
        style={{
          position: 'absolute',
          right: -8,
          bottom: 18,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: '10px solid #ffffff',
          filter: 'drop-shadow(1px 0 0 #e5e7eb)',
        }}
      />
    </motion.div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
/** Shade an hsl(...) string by adjusting its lightness. */
function shade(hsl: string, delta: number): string {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!m) return hsl;
  const [, h, s, l] = m;
  const newL = Math.max(0, Math.min(100, parseFloat(l) + delta));
  return `hsl(${h}, ${s}%, ${newL}%)`;
}
