import { useEffect, useState } from 'react';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';

interface CardProps {
  face: string;
  color?: string;
  faceDown?: boolean;
  flipped?: boolean;
  width?: number;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export function Card({
  face,
  color = tokens.accent.gold,
  faceDown = false,
  flipped = false,
  width = 64,
  onClick,
  selected = false,
  disabled = false,
}: CardProps) {
  const [isFlipped, setIsFlipped] = useState(!faceDown);

  useEffect(() => {
    if (flipped && !isFlipped) {
      play('card-flip', 0.4);
      setIsFlipped(true);
    }
  }, [flipped, isFlipped]);

  const height = width * 1.4;

  return (
    <button
      style={{
        ...styles.wrap,
        width,
        height,
        transform: selected ? 'translateY(-12px)' : 'translateY(0)',
        boxShadow: selected ? tokens.shadow.glow(color) : tokens.shadow.md,
        opacity: disabled ? 0.5 : 1,
      }}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        play('button-tap', 0.25);
        onClick?.();
      }}
    >
      <div
        style={{
          ...styles.inner,
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
        }}
      >
        <div
          style={{
            ...styles.face,
            background: color,
            color: tokens.text.inverse,
          }}
        >
          <span style={styles.faceText}>{face}</span>
        </div>
        <div style={{ ...styles.face, ...styles.back }}>
          <span style={styles.backMark}>✦</span>
        </div>
      </div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    perspective: 600,
    transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: 'pointer',
    borderRadius: tokens.radius.md,
  },
  inner: {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transition: 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  face: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    border: `1px solid ${tokens.bg.border}`,
  },
  back: {
    background: tokens.bg.surface,
    color: tokens.text.muted,
    transform: 'rotateY(180deg)',
  },
  faceText: {
    fontFamily: tokens.font.display,
    fontWeight: 700,
    fontSize: 22,
  },
  backMark: {
    fontSize: 20,
    color: tokens.accent.gold,
  },
};