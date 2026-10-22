import type { Player } from '../core/types';
import { tokens } from '../theme/tokens';

interface PlayerBadgeProps {
  player: Player;
  color: string;
  active?: boolean;
}

export function PlayerBadge({ player, color, active }: PlayerBadgeProps) {
  return (
    <div
      style={{
        ...styles.badge,
        ...(active
          ? {
              borderColor: color,
              boxShadow: tokens.shadow.glow(color),
            }
          : {}),
      }}
    >
      <span
        style={{
          ...styles.dot,
          background: color,
          boxShadow: active ? `0 0 10px ${color}` : 'none',
        }}
      />
      <span style={styles.name}>{player.name}</span>
      {player.kind === 'bot' && (
        <span style={styles.meta}>{player.difficulty ?? 'medium'}</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.pill,
    whiteSpace: 'nowrap',
    transition: 'all 240ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontSize: tokens.size.sm,
    fontWeight: 500,
    color: tokens.text.primary,
  },
  meta: {
    fontSize: 10,
    color: tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
};