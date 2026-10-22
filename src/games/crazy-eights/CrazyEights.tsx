import { useState } from 'react';
import type { Move } from '../../core/types';
import type { CrazyEightsState, CrazyEightsMove } from './types';
import { playableIds } from './logic';
import { getCard } from '../cards/deck';
import { CardView } from '../cards/CardView';
import { Hand } from '../cards/Hand';
import { CardTable } from '../cards/CardTable';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: CrazyEightsState;
  onMove: (move: Move<CrazyEightsMove>) => void;
  disabled?: boolean;
  playerId?: string;
}

export function CrazyEightsBoard({ state, onMove, disabled, playerId }: Props) {
  const me = state.hands.find((h) => h.playerId === playerId) ?? state.hands[state.turn];          // for pass-and-play; LAN uses view()
  const playable = playableIds(state, me.playerId);
  const top = state.discardPile.length
    ? getCard(state.discardPile[state.discardPile.length - 1])
    : null;

  const [pendingEight, setPendingEight] = useState<string | null>(null);

  const handlePlay = (id: string) => {
    if (disabled || !playable.has(id)) {
      play('error', 0.3);
      return;
    }
    const card = getCard(id);
    if (card.rank === '8') {
      setPendingEight(id);
      play('button-tap', 0.3);
      return;
    }
    play('card-flip', 0.4);
    onMove({
      type: 'play',
      player: me.playerId,
      payload: { cardId: id },
      ts: Date.now(),
    });
  };

  const chooseSuit = (suit: 'S' | 'H' | 'D' | 'C') => {
    if (!pendingEight) return;
    play('card-flip', 0.4);
    onMove({
      type: 'play',
      player: me.playerId,
      payload: { cardId: pendingEight, chosenSuit: suit },
      ts: Date.now(),
    });
    setPendingEight(null);
  };

  const handleDraw = () => {
    if (disabled) return;
    play('card-deal', 0.4);
    onMove({
      type: 'play',
      player: me.playerId,
      payload: { type: 'draw' },
      ts: Date.now(),
    });
  };

  return (
    <CardTable
      top={
        <>
          {state.hands.map((h, i) => {
            if (i === 0) return null;
            return (
              <div key={h.playerId} style={styles.opponent}>
                <span style={styles.oppLabel}>
                  {i === state.turn ? '◆ ' : ''}
                  {h.playerId}
                </span>
                <span style={styles.oppCount}>{h.cards.length} cards</span>
              </div>
            );
          })}
        </>
      }
      middle={
        <>
          <div style={styles.pile}>
            <CardView card={null} width={72} />
            <span style={styles.pileLabel}>Deck</span>
          </div>
          <div style={styles.pile}>
            {top && <CardView card={top} width={80} />}
            <span style={styles.pileLabel}>
              {state.suitToMatch ? `Suit: ${state.suitToMatch}` : 'Discard'}
            </span>
          </div>
        </>
      }
      bottom={
        <>
          {pendingEight && (
            <div style={styles.suitPicker}>
              <span style={styles.suitPickerLabel}>Choose suit</span>
              {(['S', 'H', 'D', 'C'] as const).map((s) => (
                <button
                  key={s}
                  style={styles.suitBtn}
                  onClick={() => chooseSuit(s)}
                >
                  {s === 'S' ? '♠' : s === 'H' ? '♥' : s === 'D' ? '♦' : '♣'}
                </button>
              ))}
            </div>
          )}
          <Hand
            cardIds={me.cards}
            playableIds={playable}
            onSelect={handlePlay}
          />
          <button
            style={{
              ...styles.drawBtn,
              opacity: disabled ? 0.4 : 1,
            }}
            onClick={handleDraw}
            disabled={disabled}
          >
            Draw
          </button>
        </>
      }
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  opponent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.md,
  },
  oppLabel: {
    fontSize: tokens.size.xs,
    color: tokens.text.secondary,
  },
  oppCount: {
    fontSize: 10,
    color: tokens.text.muted,
  },
  pile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  pileLabel: {
    fontSize: tokens.size.xs,
    color: tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  suitPicker: {
    display: 'flex',
    gap: tokens.space.sm,
    alignItems: 'center',
    padding: tokens.space.md,
    background: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.md,
  },
  suitPickerLabel: {
    fontSize: tokens.size.sm,
    color: tokens.text.secondary,
    marginRight: tokens.space.md,
  },
  suitBtn: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.sm,
    background: '#F5F2EA',
    fontSize: 24,
    color: '#C8303C',
  },
  drawBtn: {
    marginTop: tokens.space.sm,
    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
    borderRadius: tokens.radius.md,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    color: tokens.text.primary,
    fontSize: tokens.size.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
};