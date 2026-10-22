import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../theme/tokens';
import { transition } from '../theme/motion';
import { play } from '../theme/sounds';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  style,
}: ButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    play('button-tap', 0.35);
    onClick?.();
  };

  return (
    <button
      style={{
        ...styles.base,
        ...styles[size],
        ...styles[variant],
        ...(full ? { width: '100%' } : {}),
        ...(disabled ? styles.disabled : {}),
        ...style,
      }}
      disabled={disabled}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    fontFamily: tokens.font.display,
    fontWeight: 600,
    letterSpacing: 1,
    borderRadius: tokens.radius.md,
    border: '1px solid transparent',
    transition: Object.values(transition).join(', '),
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  sm: {
    padding: `${tokens.space.sm}px ${tokens.space.md}px`,
    fontSize: tokens.size.sm,
  },
  md: {
    padding: `${tokens.space.md}px ${tokens.space.lg}px`,
    fontSize: tokens.size.md,
  },
  lg: {
    padding: `${tokens.space.lg}px ${tokens.space.xl}px`,
    fontSize: tokens.size.lg,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  primary: {
    background: tokens.accent.gold,
    color: tokens.text.inverse,
    boxShadow: tokens.shadow.glow(tokens.accent.gold),
  },
  secondary: {
    background: tokens.bg.surface,
    color: tokens.text.primary,
    borderColor: tokens.bg.border,
  },
  ghost: {
    background: 'transparent',
    color: tokens.text.secondary,
    borderColor: tokens.bg.border,
  },
  danger: {
    background: tokens.state.danger,
    color: tokens.text.primary,
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};