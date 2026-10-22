import type { CSSProperties } from 'react';

interface PawnProps {
  color: string;
  size?: number;
  glowing?: boolean;
  style?: CSSProperties;
}

export function Pawn({ color, size = 40, glowing = false, style }: PawnProps) {
  const id = color.replace('#', '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{
        display: 'block',
        filter: glowing
          ? `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color}88)`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
        ...style,
      }}
    >
      <defs>
        {/* Body gradient: lighter top, darker base */}
        <radialGradient id={`pawn-body-${id}`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="25%" stopColor={color} />
          <stop offset="100%" stopColor={shade(color, -0.45)} />
        </radialGradient>

        {/* Base gradient */}
        <radialGradient id={`pawn-base-${id}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={shade(color, 0.15)} />
          <stop offset="100%" stopColor={shade(color, -0.55)} />
        </radialGradient>

        {/* Gloss highlight */}
        <linearGradient id={`pawn-gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base */}
      <ellipse cx="20" cy="35.5" rx="12" ry="3.5" fill={shade(color, -0.7)} />
      <ellipse cx="20" cy="34" rx="12" ry="3.5" fill={`url(#pawn-base-${id})`} />
      <ellipse cx="20" cy="33.5" rx="10.5" ry="2.8" fill={`url(#pawn-body-${id})`} />

      {/* Neck / body */}
      <path
        d="M 12 33 Q 14 24 17 20 Q 18.5 17 20 17 Q 21.5 17 23 20 Q 26 24 28 33 Z"
        fill={`url(#pawn-body-${id})`}
      />

      {/* Head */}
      <ellipse cx="20" cy="13.5" rx="7" ry="7.5" fill={`url(#pawn-body-${id})`} />
      <ellipse cx="18" cy="11" rx="2.8" ry="2.2" fill="#FFFFFF" opacity="0.6" />

      {/* Gloss overlay on head */}
      <ellipse cx="18" cy="10.5" rx="3.5" ry="2.5" fill={`url(#pawn-gloss-${id})`} />
    </svg>
  );
}

// Darken / lighten a hex color by a factor (-1..1)
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);

  const nr = Math.round((t - r) * p + r);
  const ng = Math.round((t - g) * p + g);
  const nb = Math.round((t - b) * p + b);

  return `#${[nr, ng, nb].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}