import type { ReactNode } from 'react';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';

interface TileProps {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  size?: number;
}

export function Tile({
  children,
  onClick,
  color = tokens.accent.gold,
  selected = false,
  disabled = false,
  size = 48,
}: TileProps) {
  return (
    <button
      style={{
        ...styles.tile,
        width: size,
        height: size,
        borderColor: selected ? color : tokens.bg.border,
        boxShadow: selected ? tokens.shadow.glow(color) : 'none',
        opacity: disabled ? 0.4 : 1,
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        play('tile-place', 0.4);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tile: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.bg.surface,
    border: '1px solid',
    borderRadius: tokens.radius.md,
    fontFamily: tokens.font.display,
    fontWeight: 600,
    color: tokens.text.primary,
    transition: 'all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: 'pointer',
  },
};