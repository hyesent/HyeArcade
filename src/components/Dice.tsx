import { useEffect, useRef, useState } from 'react';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';

interface DiceProps {
  value: number | null;
  rolling?: boolean;
  onRoll?: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
  celebrate?: boolean;      // NEW: pulse gold on a 6
  label?: string;           // NEW: caption under dice
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export function Dice({
  value,
  rolling = false,
  onRoll,
  disabled = false,
  color = tokens.text.primary,
  size = 80,
  celebrate = false,
  label,
}: DiceProps) {
  const [display, setDisplay] = useState(value ?? 1);
  const [tilt, setTilt] = useState({ x: -8, y: 6 });
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const displayRef = useRef(display);
  displayRef.current = display;

  // Shake loop — reads from local state only; doesn't fight `value`
  useEffect(() => {
    if (!rolling) {
      if (value !== null) setDisplay(value);
      return;
    }
    const interval = setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * 6));
      setTilt({
        x: -14 + Math.random() * 28,
        y: -14 + Math.random() * 28,
      });
    }, 65);
    return () => {
      clearInterval(interval);
      setTilt({ x: -8, y: 6 });
      if (value !== null) setDisplay(value);
    };
  }, [rolling, value]);

  const tappable = !disabled && !rolling && !!onRoll;
  const pips = PIP_LAYOUTS[display] ?? PIP_LAYOUTS[1];
  const pad = size * 0.16;
  const inner = size - pad * 2;
  const cell = inner / 3;
  const pipSize = size * 0.11;

  const glowColor = celebrate ? tokens.accent.gold : color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        style={{
          width: size,
          height: size,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: tappable ? 'pointer' : 'default',
          perspective: 400,
          transform: pressed
            ? 'scale(0.94)'
            : hovered && tappable
              ? 'translateY(-2px) scale(1.02)'
              : 'scale(1)',
          transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: disabled
            ? 'grayscale(0.6) brightness(0.7)'
            : celebrate
              ? `drop-shadow(0 8px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 20px ${glowColor}CC) drop-shadow(0 0 40px ${glowColor}66)`
              : `drop-shadow(0 8px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 8px ${glowColor}44)`,
        }}
        disabled={disabled || rolling || !onRoll}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => { setPressed(false); setHovered(false); }}
        onPointerEnter={() => setHovered(true)}
        onClick={() => {
          if (tappable) {
            play('button-tap', 0.3);
            onRoll?.();
          }
        }}
        aria-label={
          rolling
            ? 'Rolling dice'
            : value
              ? `Roll dice, currently showing ${value}`
              : 'Roll dice'
        }
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: size * 0.18,
            background: celebrate
              ? `radial-gradient(circle at 32% 28%, #FFF8E0 0%, #F0E5C0 40%, #D4C088 100%)`
              : `radial-gradient(circle at 32% 28%, #FFFFFF 0%, #F0EDE5 40%, #D4CDB8 100%)`,
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: rolling
              ? 'transform 65ms linear'
              : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformStyle: 'preserve-3d',
            border: `1px solid rgba(0,0,0,0.15)`,
            boxSizing: 'border-box',
            boxShadow: celebrate
              ? `inset 0 0 20px ${tokens.accent.gold}66`
              : 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: size * 0.18,
              background: `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 50%)`,
              pointerEvents: 'none',
            }}
          />
          {pips.map(([r, c], i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: pad + c * cell + cell / 2,
                top: pad + r * cell + cell / 2,
                width: pipSize,
                height: pipSize,
                background: `radial-gradient(circle at 35% 30%, #4A4A5A 0%, #14121C 70%)`,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </div>
      </button>

      {label && (
        <span
          style={{
            fontSize: tokens.size.xs,
            color: celebrate ? tokens.accent.gold : tokens.text.muted,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            transition: 'color 240ms ease',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}