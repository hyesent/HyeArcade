import type { GameSession } from '../core/types';
import { Modal } from './Modal';
import { Button } from './Button';
import { HYE } from '../core/currency';
import { HYE_POINTS } from '../core/points';
import { tokens } from '../theme/tokens';
import type { MatchAward } from '../profile/profileStore';

interface WinnerModalProps {
  open: boolean;
  session: GameSession<unknown>;
  profileAward?: MatchAward | null;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function WinnerModal({ open, session, profileAward, onPlayAgain, onExit }: WinnerModalProps) {
  const result = session.result;

  if (!result) return null;

  const winner = session.players.find((p) => p.id === result.winner);
  const hye = winner ? result.hyeEarned?.[winner.id] : undefined;
  const points = winner ? result.pointsEarned?.[winner.id] : undefined;

  return (
    <Modal open={open}>
      <div style={styles.wrap}>
        <p style={styles.kicker}>{result.winner ? '★ MATCH COMPLETE ★' : 'MATCH DRAW'}</p>
        <h1 style={styles.name}>{winner?.name ?? 'Draw'}</h1>

        {hye !== undefined && (
          <div style={styles.reward}>
            <span style={{ ...styles.rewardIcon, color: HYE.color }}>{HYE.symbol}</span>
            <span style={styles.rewardValue}>{HYE.format(hye)}</span>
          </div>
        )}

        {points !== undefined && (
          <div style={styles.reward}>
            <span style={{ ...styles.rewardIcon, color: HYE_POINTS.color }}>
              {HYE_POINTS.symbol}
            </span>
            <span style={styles.rewardValue}>{HYE_POINTS.format(points)}</span>
          </div>
        )}

        <p style={styles.reason}>{result.reason}</p>

        {profileAward && <div style={styles.profileReward}>
          <div style={styles.profileRewardTop}><strong>+{profileAward.record.xpEarned} XP</strong><span>Profile total: {profileAward.totalXp.toLocaleString()} XP</span></div>
          {profileAward.unlockedAchievements.length > 0 && <div style={styles.unlockBlock}><span style={styles.unlockLabel}>ACHIEVEMENTS UNLOCKED</span>{profileAward.unlockedAchievements.slice(0, 4).map((item) => <span key={item.id} style={styles.unlockItem}>{item.title}</span>)}</div>}
          {profileAward.unlockedTitles.length > 0 && <div style={styles.unlockBlock}><span style={styles.unlockLabel}>NEW TITLES</span>{profileAward.unlockedTitles.map((item) => <span key={item.id} style={styles.unlockItem}>{item.name}</span>)}</div>}
        </div>}

        <div style={styles.actions}>
          <Button variant="primary" size="lg" full onClick={onPlayAgain}>
            Play Again
          </Button>
          <Button variant="ghost" full onClick={onExit}>
            Home
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.space.md,
    textAlign: 'center',
  },
  kicker: {
    margin: 0,
    fontSize: tokens.size.xs,
    color: tokens.accent.gold,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  name: {
    margin: 0,
    fontFamily: tokens.font.display,
    fontSize: tokens.size.hero,
    fontWeight: 700,
    color: tokens.text.primary,
  },
  reward: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
    background: tokens.bg.surface,
    borderRadius: tokens.radius.pill,
    border: `1px solid ${tokens.bg.border}`,
  },
  rewardIcon: {
    fontSize: tokens.size.lg,
    fontWeight: 700,
  },
  rewardValue: {
    fontSize: tokens.size.md,
    fontWeight: 600,
    color: tokens.text.primary,
  },
  profileReward: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, background: 'rgba(79,209,160,.08)', border: '1px solid rgba(79,209,160,.25)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 },
  profileRewardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, color: '#B9F5DB', fontSize: 12 },
  unlockBlock: { display: 'flex', flexDirection: 'column', gap: 5 },
  unlockLabel: { color: tokens.accent.gold, fontSize: 8, letterSpacing: 1.4, fontWeight: 900 },
  unlockItem: { color: tokens.text.primary, fontSize: 11, lineHeight: 1.4 },
  reason: {
    margin: 0,
    fontSize: tokens.size.sm,
    color: tokens.text.muted,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.sm,
    width: '100%',
    marginTop: tokens.space.md,
  },
};