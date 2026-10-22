import type { CSSProperties } from 'react';
import { tokens } from '../theme/tokens';

interface PieceProps {
  color: string;
  shape?: 'disc' | 'pawn' | 'square' | 'crown';
  size?: number;
  selected?: boolean;
  style?: CSSProperties;
}

export function Piece({
  color,
  shape = 'disc',
  size = 32,
  selected = false,
  style,
}: PieceProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    background: color,
    boxShadow: selected
      ? `0 0 16px ${color}, 0 0 32px ${color}66`
      : `inset 0 -2px 4px rgba(0,0,0,0.25)`,
    transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    ...style,
  };

  if (shape === 'disc') {
    return <div style={{ ...base, borderRadius: '50%' }} />;
  }
  if (shape === 'pawn') {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <div
          style={{
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: '50% 50% 40% 40%',
            background: color,
            boxShadow: selected ? tokens.shadow.glow(color) : 'none',
          }}
        />
      </div>
    );
  }
  if (shape === 'square') {
    return <div style={{ ...base, borderRadius: tokens.radius.sm }} />;
  }
  // crown
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.text.inverse,
        fontSize: size * 0.5,
        fontWeight: 700,
        boxShadow: selected ? tokens.shadow.glow(color) : 'none',
        ...style,
      }}
    >
      ♛
    </div>
  );
}