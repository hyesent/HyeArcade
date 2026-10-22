import { useState } from 'react';
import type { Move } from '../../core/types';
import type { SolitaireState, SolitaireMove, Card } from './types';
import { canStackTableau, canStackFoundation } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: SolitaireState;
  onMove: (move: Move<SolitaireMove>) => void;
  disabled?: boolean;
}

const SUIT_SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function SolitaireBoard({ state, onMove, disabled }: Props) {
  const [selected, setSelected] = useState<{ zone: 'waste' | 'tableau'; idx: number; cardIdx?: number } | null>(null);

  const send = (payload: SolitaireMove) => {
    play('card-flip', 0.35);
    onMove({
      type: 'play',
      player: state.playerId,
      payload,
      ts: Date.now(),
    });
    setSelected(null);
  };

  const wasteTop = state.waste[state.waste.length - 1];

  const handleWasteClick = () => {
    if (disabled) return;
    if (state.stock.length > 0) {
      send({ type: 'draw' });
      return;
    }
    if (state.waste.length > 0) {
      send({ type: 'recycle' });
      return;
    }
  };

  const handleWasteToFoundation = () => {
    if (!wasteTop) return;
    for (let i = 0; i < 4; i++) {
      if (canStackFoundation(wasteTop, state.foundations[i][state.foundations[i].length - 1])) {
        send({ type: 'waste-to-foundation', foundationIdx: i });
        return;
      }
    }
    play('error', 0.3);
  };

  const handleFoundationClick = (card: Card, i: number) => {
    if (!wasteTop) return;
    if (canStackFoundation(wasteTop, card)) {
      send({ type: 'waste-to-foundation', foundationIdx: i });
    }
  };

  const handleTableauClick = (colIdx: number, cardIdx: number) => {
    if (disabled) return;
    const col = state.tableau[colIdx];
    const card = col[cardIdx];

    // If waste is selected or top of waste exists, try moving it here
    if (selected?.zone === 'waste') {
      if (!wasteTop || !canStackTableau(wasteTop, card)) {
        play('error', 0.3);
        return;
      }
      send({ type: 'waste-to-tableau', tableauIdx: colIdx });
      return;
    }

    // Moving from another tableau column
    if (selected?.zone === 'tableau') {
      if (selected.idx === colIdx) {
        setSelected(null);
        return;
      }
      const moving = state.tableau[selected.idx][selected.cardIdx ?? 0];
      if (!canStackTableau(moving, card)) {
        play('error', 0.3);
        return;
      }
      send({
        type: 'tableau-to-tableau',
        fromIdx: selected.idx,
        cardIdx: selected.cardIdx ?? 0,
        toIdx: colIdx,
      });
      return;
    }

    // Try foundation first
    if (cardIdx === col.length - 1) {
      for (let i = 0; i < 4; i++) {
        if (canStackFoundation(card, state.foundations[i][state.foundations[i].length - 1])) {
          send({ type: 'tableau-to-foundation', tableauIdx: colIdx, foundationIdx: i });
          return;
        }
      }
    }

    // Select for tableau move
    if (card.faceUp) {
      setSelected({ zone: 'tableau', idx: colIdx, cardIdx });
      play('button-tap', 0.2);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.tableLabel}>KLONDIKE • BUILD FOUNDATIONS A→K • BUILD TABLEAU DOWN IN ALTERNATING COLORS</div>
      <div style={styles.topRow}>
        {/* Stock / Waste */}
        <div style={styles.stockPile} onClick={handleWasteClick}>
          {state.stock.length > 0 ? (
            <FaceDown />
          ) : (
            <EmptySlot label="↻" />
          )}
        </div>

        <div style={styles.wastePile} onClick={handleWasteToFoundation}>
          {wasteTop ? <CardFace card={wasteTop} /> : <EmptySlot />}
        </div>

        {/* Foundations */}
        <div style={styles.foundations}>
          {state.foundations.map((f, i) => {
            const top = f[f.length - 1];
            return (
              <div
                key={i}
                style={styles.foundation}
                onClick={() => top ? handleFoundationClick(top, i) : undefined}
              >
                {top ? <CardFace card={top} /> : <EmptySlot label={SUIT_SYMBOL[['S', 'H', 'D', 'C'][i]]} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau */}
      <div style={styles.tableau}>
        {state.tableau.map((col, colIdx) => (
          <div key={colIdx} style={styles.column}>
            {col.length === 0 && (
              <div style={styles.emptyCol} onClick={() => handleTableauClick(colIdx, 0)}>
                <EmptySlot />
              </div>
            )}
            {col.map((card, cardIdx) => {
              const isSelected =
                selected?.zone === 'tableau' &&
                selected.idx === colIdx &&
                (selected.cardIdx ?? 0) <= cardIdx;
              return (
                <div
                  key={card.id}
                  style={{
                    ...styles.tableauCard,
                    marginTop: cardIdx === 0 ? 0 : -80,
                    zIndex: cardIdx,
                  }}
                  onClick={() => handleTableauClick(colIdx, cardIdx)}
                >
                  {card.faceUp ? (
                    <CardFace card={card} selected={isSelected} />
                  ) : (
                    <FaceDown />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardFace({ card, selected }: { card: Card; selected?: boolean }) {
  const red = card.suit === 'H' || card.suit === 'D';
  return (
    <div
      style={{
        ...styles.card,
        background: '#F5F2EA',
        color: red ? '#C8303C' : '#1A1720',
        borderColor: selected ? tokens.accent.gold : tokens.bg.border,
        boxShadow: selected
          ? `0 8px 20px rgba(0,0,0,0.5), 0 0 16px ${tokens.accent.gold}88`
          : `0 2px 6px rgba(0,0,0,0.5)`,
        transform: selected ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <span style={styles.cardRank}>{card.rank}</span>
      <span style={styles.cardSuit}>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

function FaceDown() {
  return (
    <div
      style={{
        ...styles.card,
        background: `repeating-linear-gradient(45deg, #1f4774 0px, #1f4774 5px, #173657 5px, #173657 10px)`,
        border: `1px solid ${tokens.bg.border}`,
        color: tokens.accent.gold,
      }}
    >
      ✦
    </div>
  );
}

function EmptySlot({ label }: { label?: string }) {
  return (
    <div
      style={{
        ...styles.card,
        background: 'transparent',
        border: `1px dashed ${tokens.bg.border}`,
        color: tokens.text.muted,
        fontSize: 24,
      }}
    >
      {label ?? ''}
    </div>
  );
}

const CARD_W = 60;
const CARD_H = 84;

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.lg,
    padding: tokens.space.md,
    width: '100%',
    minHeight: '100%',
    overflowY: 'auto',
  },
  topRow: {
    display: 'flex',
    gap: tokens.space.md,
    alignItems: 'flex-start',
  },
  stockPile: { cursor: 'pointer' },
  wastePile: { cursor: 'pointer' },
  foundations: {
    display: 'flex',
    gap: tokens.space.sm,
    marginLeft: 'auto',
  },
  foundation: { cursor: 'pointer' },
  tableau: {
    display: 'flex',
    gap: tokens.space.sm,
    justifyContent: 'center',
    paddingTop: tokens.space.sm,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    width: CARD_W,
    minHeight: CARD_H,
  },
  emptyCol: { cursor: 'pointer' },
  tableauCard: { position: 'relative' },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.font.display,
    fontWeight: 700,
    border: '1px solid',
    transition: 'all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: 'pointer',
  },
  cardRank: { fontSize: 18, lineHeight: 1 },
  cardSuit: { fontSize: 20, lineHeight: 1 },
};