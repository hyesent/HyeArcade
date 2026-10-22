import { useState } from 'react';
import type { Move } from '../../core/types';
import type { UnoState, UnoMove, UnoColor } from './types';
import { getUnoCard, canPlayUno } from './deck';
import { UnoCardView } from './UnoCard';
import { CardTable } from '../cards/CardTable';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: UnoState;
  onMove: (move: Move<UnoMove>) => void;
  disabled?: boolean;
  playerId?: string;
}

export function UnoBoard({ state, onMove, disabled, playerId }: Props) {
  const me = state.hands.find((h) => h.playerId === playerId) ?? state.hands[state.turn];
  const top = getUnoCard(state.discardPile[state.discardPile.length - 1]);

  const playable = new Set(
    me.cards.filter((id) =>
      canPlayUno(getUnoCard(id), top, state.activeColor, state.pendingDraw, me.cards.map(getUnoCard)),
    ),
  );

  const [pendingWild, setPendingWild] = useState<string | null>(null);

  const handlePlay = (id: string) => {
    if (disabled || !playable.has(id)) {
      play('error', 0.3);
      return;
    }
    const card = getUnoCard(id);
    if (card.value === 'WILD' || card.value === 'WILD4') {
      setPendingWild(id);
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

  const chooseColor = (c: UnoColor) => {
    if (!pendingWild) return;
    play('card-flip', 0.4);
    onMove({
      type: 'play',
      player: me.playerId,
      payload: { cardId: pendingWild, chosenColor: c },
      ts: Date.now(),
    });
    setPendingWild(null);
  };

  return (
    <CardTable
      top={
        <>
          {state.hands.map((h, i) =>
            i === 0 ? null : (
              <div key={h.playerId} style={styles.opponent}>
                <span style={styles.oppLabel}>{h.playerId}</span>
                <span style={styles.oppCount}>{h.cards.length}</span>
              </div>
            ),
          )}
        </>
      }
      middle={
        <>
          <UnoCardView card={null} width={72} />
          <UnoCardView card={top} width={82} />
          <div style={{ ...styles.colorDot, background: colorHex(state.activeColor) }} />
        </>
      }
      bottom={
        <>
          {pendingWild && (
            <div style={styles.colorPicker}>
              {(['R', 'G', 'B', 'Y'] as UnoColor[]).map((c) => (
                <button
                  key={c}
                  style={{ ...styles.colorBtn, background: colorHex(c) }}
                  onClick={() => chooseColor(c)}
                />
              ))}
            </div>
          )}
          <div style={styles.hand}>
            {me.cards.map((id) => (
              <UnoCardView
                key={id}
                card={getUnoCard(id)}
                width={60}
                playable={playable.has(id)}
                onClick={() => handlePlay(id)}
              />
            ))}
          </div>
          {state.wild4Challenge?.playerId === me.playerId && (
            <button
              style={styles.challengeBtn}
              onClick={() => onMove({
                type: 'play',
                player: me.playerId,
                payload: { type: 'challengeWild4' },
                ts: Date.now(),
              })}
              disabled={disabled}
            >
              Challenge Wild Draw 4
            </button>
          )}
          {me.cards.length === 1 && !me.hasCalledUno && (
            <button style={styles.challengeBtn} onClick={() => onMove({ type: 'play', player: me.playerId, payload: { type: 'callUno' }, ts: Date.now() })} disabled={disabled}>
              Call UNO
            </button>
          )}
          {state.hands.filter(h => h.playerId !== me.playerId && h.cards.length === 1 && !h.hasCalledUno).map(h => (
            <button key={`catch-${h.playerId}`} style={styles.challengeBtn} onClick={() => onMove({ type: 'play', player: me.playerId, payload: { type: 'callUno', targetPlayerId: h.playerId }, ts: Date.now() })} disabled={disabled}>
              Catch {h.playerId} — UNO
            </button>
          ))}
          <div style={styles.scoreRow}>
            <span>Round {state.round}</span>
            {state.hands.map((h) => <span key={h.playerId} style={styles.scoreItem}>{h.playerId}: {state.scores[h.playerId] ?? 0} pts</span>)}
          </div>
          {state.drawnCardId && (
            <button style={styles.drawBtn} onClick={() => onMove({ type: 'play', player: me.playerId, payload: { type: 'pass' }, ts: Date.now() })} disabled={disabled}>
              End Turn
            </button>
          )}
          <button
            style={styles.drawBtn}
            onClick={() => {
              if (disabled) return;
              play('card-deal', 0.4);
              onMove({
                type: 'play',
                player: me.playerId,
                payload: { type: 'draw' },
                ts: Date.now(),
              });
            }}
            disabled={disabled}
          >
            Draw
          </button>
        </>
      }
    />
  );
}

function colorHex(c: string): string {
  return { R: '#E23E57', G: '#4FD1A0', B: '#4FB8D9', Y: '#E8B95C', W: '#8B7FE8' }[c] ?? '#8B7FE8';
}

const styles: Record<string, React.CSSProperties> = {
  opponent: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: `4px 12px`,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.pill,
  },
  oppLabel: { fontSize: tokens.size.xs, color: tokens.text.secondary },
  oppCount: { fontSize: tokens.size.xs, color: tokens.text.primary, fontWeight: 600 },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    boxShadow: '0 0 12px currentColor',
  },
  colorPicker: {
    display: 'flex',
    gap: tokens.space.md,
    marginBottom: tokens.space.md,
  },
  colorBtn: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '2px solid #F5F2EA',
  },
  hand: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    paddingTop: 20,
  },
  challengeBtn: {
    marginTop: tokens.space.sm,
    padding: `8px 18px`,
    borderRadius: tokens.radius.md,
    background: '#8B7FE8',
    border: `1px solid ${tokens.bg.border}`,
    color: '#fff',
    fontSize: tokens.size.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scoreRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems:'center',
    width:'100%',
    marginTop: tokens.space.sm,
    padding:10,
    borderRadius:14,
    border:'1px solid rgba(255,255,255,.1)',
    background:'linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02))',
    color: tokens.text.secondary,
    fontSize: tokens.size.xs,
  },
  scoreItem:{padding:'7px 10px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.07)',fontWeight:900,color:tokens.text.primary},
  drawBtn: {
    marginTop: tokens.space.sm,
    padding: `8px 24px`,
    borderRadius: tokens.radius.md,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    color: tokens.text.primary,
    fontSize: tokens.size.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
};