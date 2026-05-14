/**
 * TreadyLab — scratch tuning page for the TreadyCharacter component.
 *
 * Public route at /tready-lab. No auth, no app context, no DB writes. Use to
 * tune the character's defaults and review each state in isolation before
 * (or after) it ships into the live bubble.
 */
import { useRef, useState } from 'react';
import { TreadyCharacter, type TreadyState } from '@/components/tready/TreadyCharacter';

const STATES: TreadyState[] = ['idle', 'thinking', 'talking', 'pointing', 'hidden'];

export default function TreadyLab() {
  const [state, setState] = useState<TreadyState>('idle');
  const [speechText, setSpeechText] = useState("Hi — I'm Tready. Tap a target on the canvas and watch my eyes track it.");
  const [size, setSize] = useState(120);
  const [squish, setSquish] = useState(0.35);
  const [wobbleCycle, setWobbleCycle] = useState(5);
  const [rubberColor, setRubberColor] = useState('hsl(24, 10%, 22%)');
  const [jacketColor, setJacketColor] = useState('hsl(212, 70%, 52%)');
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<'br' | 'bl' | 'tr' | 'tl' | 'center'>('br');

  const refTargetRef = useRef<HTMLButtonElement | null>(null);
  const [useRefTarget, setUseRefTarget] = useState(false);

  const canvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setTarget({ x: e.clientX, y: e.clientY });
  };

  const positions = {
    br: { right: 32, bottom: 32 },
    bl: { left: 32, bottom: 32 },
    tr: { right: 32, top: 32 },
    tl: { left: 32, top: 32 },
    center: { right: window.innerWidth / 2 - size / 2, bottom: window.innerHeight / 2 - size / 2 },
  } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0d', color: '#e5e7eb', position: 'relative' }}>
      {/* Click-anywhere canvas to set the pointing target */}
      <div
        onClick={canvasClick}
        style={{
          position: 'fixed',
          inset: 0,
          cursor: 'crosshair',
          background:
            'radial-gradient(circle at 30% 20%, rgba(22,163,74,0.12), transparent 40%), ' +
            'radial-gradient(circle at 70% 80%, rgba(59,130,246,0.10), transparent 50%), ' +
            '#0a0b0d',
        }}
        aria-label="Tready Lab canvas — click to set the pointing target"
      />

      {/* Target marker */}
      {target && (
        <div
          style={{
            position: 'fixed',
            left: target.x - 10,
            top: target.y - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: 'rgba(34, 211, 238, 0.9)',
            boxShadow: '0 0 0 6px rgba(34,211,238,0.25), 0 0 20px rgba(34,211,238,0.5)',
            pointerEvents: 'none',
            zIndex: 90001,
          }}
        />
      )}

      {/* Headline */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 24,
          right: 24,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 90002,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>Tready Lab</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Click anywhere on the canvas to set a pointing target. Switch states from the panel.
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, fontFamily: 'ui-monospace, monospace' }}>
          v1 · self-contained · no app integration
        </div>
      </div>

      {/* Control panel */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          left: 24,
          width: 320,
          background: 'rgba(17,24,39,0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontSize: 13,
          zIndex: 90002,
          pointerEvents: 'auto',
        }}
      >
        <Section title="State">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                style={{
                  background: state === s ? 'hsl(212,70%,52%)' : 'rgba(255,255,255,0.06)',
                  color: state === s ? '#fff' : '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Speech text">
          <textarea
            value={speechText}
            onChange={(e) => setSpeechText(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.35)',
              color: '#e5e7eb',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: 8,
              fontFamily: 'inherit',
              fontSize: 12,
              resize: 'vertical',
            }}
          />
        </Section>

        <Section title="Target">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {target ? `coord: ${Math.round(target.x)}, ${Math.round(target.y)}` : 'click the canvas to set'}
              {useRefTarget && ' (overridden by ref)'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTarget(null)} style={btn()}>
                Clear coord
              </button>
              <button onClick={() => setUseRefTarget((v) => !v)} style={btn(useRefTarget)}>
                {useRefTarget ? 'Using element ref' : 'Use element ref'}
              </button>
            </div>
            <button
              ref={refTargetRef}
              style={{
                ...btn(),
                marginTop: 4,
                padding: '10px 12px',
                background: 'rgba(34,211,238,0.15)',
                border: '1px solid rgba(34,211,238,0.6)',
              }}
            >
              Element-ref target (drag the window to move it)
            </button>
          </div>
        </Section>

        <Section title="Tuning">
          <Slider label="size" min={60} max={220} value={size} onChange={setSize} />
          <Slider label="squish" min={0} max={1} step={0.05} value={squish} onChange={setSquish} />
          <Slider label="wobbleCycle" min={1} max={10} step={0.5} value={wobbleCycle} onChange={setWobbleCycle} />
          <ColorRow label="rubber" value={rubberColor} onChange={setRubberColor} />
          <ColorRow label="jacket" value={jacketColor} onChange={setJacketColor} />
        </Section>

        <Section title="Position">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(['br', 'bl', 'tr', 'tl', 'center'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                style={btn(position === p)}
              >
                {p}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* The character — driven by the controls above */}
      <TreadyCharacter
        state={state}
        speechText={speechText}
        target={useRefTarget ? refTargetRef : target ?? undefined}
        size={size}
        squish={squish}
        wobbleCycle={wobbleCycle}
        rubberColor={rubberColor}
        jacketColor={jacketColor}
        position={positions[position]}
        onClick={() => setState((s) => (s === 'thinking' ? 'idle' : 'thinking'))}
        ariaLabel="Tready (lab)"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function btn(active = false): React.CSSProperties {
  return {
    background: active ? 'hsl(212,70%,52%)' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : '#cbd5e1',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  };
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
        {Number.isInteger(step) ? value : value.toFixed(2)}
      </span>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'rgba(0,0,0,0.35)',
          color: '#e5e7eb',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '6px 8px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          width: '100%',
        }}
      />
    </div>
  );
}
