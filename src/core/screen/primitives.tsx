import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';
import { Icon, type IconName } from '../../components/Icon';
import type { GameResult, Player, PlayerId, SessionStatus } from '../types';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function seatColor(seat: number): string {
  const palette = tokens.seat ?? [];
  if (palette.length === 0) return tokens.accent.gold;
  return palette[seat % palette.length];
}

// ---------------------------------------------------------------
// Cabinet
// ---------------------------------------------------------------

interface CabinetProps {
  accent: string;
  children: ReactNode;
  bare?: boolean;
}

export function Cabinet({ accent, children, bare }: CabinetProps) {
  if (bare) {
    return (
      <div style={{ ...styles.cabinet, background: 'transparent' }}>
        {children}
      </div>
    );
  }
  return (
    <div
      className="hye-cabinet"
      style={{
        ...styles.cabinet,
        background: `
          radial-gradient(120% 90% at 50% 0%, ${accent}0F 0%, transparent 55%),
          radial-gradient(120% 90% at 50% 100%, ${accent}08 0%, transparent 55%),
          ${tokens.bg.base}
        `,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------

interface MarqueeProps {
  title: string;
  accent: string;
  onBack: () => void;
  onReset?: () => void;
}

export function Marquee({ title, accent, onBack, onReset: _onReset }: MarqueeProps) {
  return (
    <header style={styles.marquee}>
      <button
        style={styles.iconBtn}
        onClick={() => {
          play('button-tap', 0.3);
          onBack();
        }}
        aria-label="Back"
      >
        <Icon name="arrow-left" size={18} color={tokens.text.primary} />
      </button>

      <div style={styles.marqueeTitleBlock}>
        <span style={styles.marqueeTitle}>{title}</span>
        <span
          style={{
            ...styles.marqueeUnderline,
            background: accent,
            boxShadow: `0 0 12px ${accent}AA`,
          }}
        />
      </div>

      <span style={styles.iconBtnSpacer} />
    </header>
  );
}

// ---------------------------------------------------------------
// Bezel
// ---------------------------------------------------------------

interface BezelProps {
  accent: string;
  aspectRatio?: string;
  children: ReactNode;
  bleed?: boolean;
}

export function Bezel({
  accent,
  aspectRatio = '1 / 1',
  children,
  bleed,
}: BezelProps) {
  return (
    <div
      className="hye-bezel"
      style={{
        ...styles.bezel,
        ...(bleed
          ? { aspectRatio: 'auto', width: '100%', height: '100%', padding: 0 }
          : { aspectRatio }),
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          inset 0 -24px 48px rgba(0,0,0,0.55),
          0 0 60px ${accent}22,
          0 24px 48px rgba(0,0,0,0.5)
        `,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------
// Stage
// ---------------------------------------------------------------

interface StageProps {
  accent: string;
  children: ReactNode;
}

export function Stage({ accent, children }: StageProps) {
  return (
    <div className="hye-stage" style={styles.stage}>
      <div
        style={{
          ...styles.stageLayer,
          background: `radial-gradient(120% 100% at 50% 120%, ${accent}1A 0%, transparent 60%)`,
        }}
      />
      <div style={styles.stageScanlines} />
      <div style={styles.stageVignette} />
      <div style={styles.stageContent}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------
// ControlDeck
// ---------------------------------------------------------------

interface ControlDeckProps {
  children: ReactNode;
  accent: string;
}

export function ControlDeck({ children }: ControlDeckProps) {
  return (
    <footer
      className="hye-control-deck"
      style={{
        ...styles.deck,
        borderTop: `1px solid ${tokens.bg.divider}`,
      }}
    >
      {children}
    </footer>
  );
}

// ---------------------------------------------------------------
// PlayerPips
// ---------------------------------------------------------------

interface PlayerPipsProps {
  players: Player[];
  currentId: PlayerId | null;
  onPlayerSelect?: (player: Player) => void;
}

export function PlayerPips({ players, currentId, onPlayerSelect }: PlayerPipsProps) {
  return (
    <div style={styles.pips}>
      {players.map((p) => {
        const color = seatColor(p.seat);
        const isCurrent = p.id === currentId;
        return (
          <button
            type="button"
            key={p.id}
            style={{
              ...styles.pip,
              cursor: onPlayerSelect && p.kind !== 'bot' ? 'pointer' : 'default',
              ...(isCurrent
                ? { borderColor: color, boxShadow: tokens.shadow.glow(color) }
                : {}),
            }}
            onClick={() => { if (p.kind !== 'bot') onPlayerSelect?.(p); }}
            aria-label={p.kind === 'bot' ? `${p.name}, bot` : `View ${p.name}'s profile`}
          >
            <span
              style={{
                ...styles.pipDot,
                background: color,
                boxShadow: isCurrent ? `0 0 10px ${color}` : 'none',
              }}
            />
            <span style={styles.pipName}>{p.name}</span>
            {isCurrent && <span style={styles.pipTurn}>TURN</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// TurnBadge
// ---------------------------------------------------------------

interface TurnBadgeProps {
  players: Player[];
  currentId: PlayerId | null;
  status: SessionStatus;
  result: GameResult | null;
  isMyTurn: boolean;
}

export function TurnBadge({
  players,
  currentId,
  status,
  result,
  isMyTurn,
}: TurnBadgeProps) {
  let label = '';
  let color = tokens.text.secondary;

  if (status === 'playing') {
    const p = players.find((x) => x.id === currentId);
    label = isMyTurn ? 'Your turn' : `${p?.name ?? '…'}'s turn`;
    if (p) color = seatColor(p.seat);
  } else if (status === 'finished') {
    if (result?.winner) {
      const w = players.find((x) => x.id === result.winner);
      label = `${w?.name ?? 'Winner'} wins`;
      if (w) color = seatColor(w.seat);
    } else {
      label = 'Draw';
      color = tokens.text.muted;
    }
  }

  return (
    <div style={styles.turnBadge}>
      {status === 'playing' && (
        <span
          style={{
            ...styles.turnDot,
            background: color,
            boxShadow: `0 0 12px ${color}`,
            animation: 'hye-pulse 1.6s ease-in-out infinite',
          }}
        />
      )}
      <span style={{ ...styles.turnLabel, color }}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------
// ActionBar
// ---------------------------------------------------------------

interface ActionBarProps {
  onReset?: () => void;
  onUndo?: () => void;
  onRules?: () => void;
}

export function ActionBar({ onReset, onUndo, onRules }: ActionBarProps) {
  const btn = (label: string, icon: IconName, fn?: () => void) => {
    if (!fn) return null;
    return (
      <button
        key={label}
        style={styles.actionBtn}
        onClick={() => {
          play('button-tap', 0.3);
          fn();
        }}
        aria-label={label}
      >
        <Icon name={icon} size={16} color={tokens.text.secondary} />
      </button>
    );
  };
  return (
    <div style={styles.actionBar}>
      {btn('Rules', 'info', onRules)}
      {btn('Undo', 'rotate', onUndo)}
      {btn('Reset', 'rotate', onReset)}
    </div>
  );
}

// ---------------------------------------------------------------
// Styles
// ---------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  cabinet: {
    minHeight: '100dvh',
    height: '100dvh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: `${tokens.space.md}px ${tokens.space.md}px ${tokens.space.lg}px`,
    gap: tokens.space.md,
    animation: 'hye-fade-in 240ms ease-out',
  },
  marquee: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    flexShrink: 0,
  },
  iconBtnSpacer: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  marqueeTitleBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  marqueeTitle: {
    fontFamily: tokens.font.display,
    fontWeight: 700,
    fontSize: tokens.size.md,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: tokens.text.primary,
  },
  marqueeUnderline: {
    width: 48,
    height: 2,
    borderRadius: 2,
  },
  bezel: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.md,
    background: `radial-gradient(120% 100% at 50% 0%, ${tokens.bg.raised} 0%, ${tokens.bg.base} 75%)`,
    border: `2px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  stage: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  stageLayer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  stageScanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'repeating-linear-gradient(transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)',
    mixBlendMode: 'overlay',
  },
  stageVignette: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)',
  },
  stageContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xs,
  },
  pips: {
    display: 'flex',
    gap: tokens.space.sm,
    flexWrap: 'wrap',
    minWidth: 0,
    alignItems: 'stretch',
  },
  pip: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    minHeight: 42,
    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
    background: 'linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025))',
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: 14,
    whiteSpace: 'nowrap',
    transition: 'all 240ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  pipDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  pipName: {
    fontSize: tokens.size.xs,
    fontWeight: 800,
    color: tokens.text.primary,
  },
  pipTurn: {
    padding:'3px 6px',
    borderRadius:7,
    background:'rgba(232,185,92,.16)',
    border:'1px solid rgba(232,185,92,.28)',
    color:'#f0d58b',
    fontSize:8,
    fontWeight:1000,
    letterSpacing:1,
  },
  turnBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    minHeight: 38,
    padding:'7px 13px',
    borderRadius:13,
    border:`1px solid ${tokens.bg.border}`,
    background:'linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.02))',
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  turnLabel: {
    fontSize: tokens.size.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 900,
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.space.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
  },
};