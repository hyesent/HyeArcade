import { useEffect, useState } from 'react';
import type { Move } from '../../core/types';
import type { WhotState, WhotMove, WhotShape } from './types';
import { getWhotCard, canPlayWhot } from './deck';
import { CardTable } from '../cards/CardTable';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: WhotState;
  onMove: (move: Move<WhotMove>) => void;
  disabled?: boolean;
  playerId?: string;
  playerNames?: Record<string, string>;
}

const SHAPE_SYMBOL: Record<WhotShape, string> = {
  circle: '●',
  triangle: '▲',
  cross: '✚',
  square: '■',
  star: '★',
  whot: 'W',
};

const SHAPE_COLOR: Record<WhotShape, string> = {
  circle: '#E23E57',
  triangle: '#4FB8D9',
  cross: '#8B7FE8',
  square: '#4FD1A0',
  star: '#E8B95C',
  whot: '#FF5C7A',
};

export function WhotBoard({ state, onMove, disabled, playerId, playerNames }: Props) {
  const me = state.hands.find((h) => h.playerId === playerId) ?? state.hands[state.turn];
  const top = getWhotCard(state.discardPile[state.discardPile.length - 1]);

  const playable = new Set(
    me.cards.filter((id) =>
      canPlayWhot(getWhotCard(id), top, state.requiredShape, state.marketCount),
    ),
  );

  const [pendingWhot, setPendingWhot] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (!feedback) return; const timer = setTimeout(() => setFeedback(''), 3000); return () => clearTimeout(timer); }, [feedback]);

  const handlePlay = (id: string) => {
    if (disabled) return;
    if (!playable.has(id)) {
      const card = getWhotCard(id);
      const topCard = top;
      if (state.marketCount > 0) {
        setFeedback(`${card.number === 2 || card.number === 5 ? 'That card cannot counter this penalty.' : 'That card cannot answer the market penalty.'} Play a matching ${topCard.number === 2 ? '2' : '5'} to counter, or go to Market and draw ${state.marketCount}.`);
      } else if (state.requiredShape) {
        setFeedback(`Not that shape. The WHOT call is ${state.requiredShape}; play a ${state.requiredShape} card or use a WHOT card.`);
      } else {
        setFeedback(`That card does not match the top card. Play ${topCard.shape === 'whot' ? 'the called shape' : `a ${topCard.shape} or another ${topCard.number}`}, or use a WHOT card.`);
      }
      play('error', 0.3);
      return;
    }
    setFeedback('');
    const card = getWhotCard(id);
    if (card.shape === 'whot') {
      setPendingWhot(id);
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

  const chooseShape = (s: WhotShape) => {
    if (!pendingWhot) return;
    setFeedback('');
    play('card-flip', 0.4);
    onMove({
      type: 'play',
      player: me.playerId,
      payload: { cardId: pendingWhot, requestedShape: s },
      ts: Date.now(),
    });
    setPendingWhot(null);
  };

  return (
    <CardTable
      top={
        <>
          {state.hands.map((h) =>
            h.playerId === me.playerId ? null : (
              <div key={h.playerId} style={{ ...styles.opponent, ...(h.playerId === state.hands[state.turn]?.playerId ? styles.opponentActive : {}) }}>
                <div style={styles.oppBacks}>{h.cards.map((_, n) => <span key={n} style={styles.cardBack} />)}</div>
                <span style={styles.oppLabel}>{playerNames?.[h.playerId] ?? h.playerId}</span>
                <span style={styles.oppCount}>{h.cards.length} cards</span>
              </div>
            ),
          )}
        </>
      }
      middle={
        <>
          <WhotCardView card={null} width={72} />
          <WhotCardView card={top} width={82} />
          {state.requiredShape && (
            <div style={styles.required}>
              <span>Shape:</span>
              <span style={{ fontSize: 24, color: SHAPE_COLOR[state.requiredShape] }}>
                {SHAPE_SYMBOL[state.requiredShape]}
              </span>
            </div>
          )}
        </>
      }
      bottom={
        <>
          {feedback && <div role="status" aria-live="polite" style={styles.feedback}><strong>WHOT RULE</strong><span>{feedback}</span></div>}
          {pendingWhot && (
            <div style={styles.shapePicker}>
              {(['circle', 'triangle', 'cross', 'square', 'star'] as WhotShape[]).map((s) => (
                <button
                  key={s}
                  style={{ ...styles.shapeBtn, color: SHAPE_COLOR[s] }}
                  onClick={() => chooseShape(s)}
                >
                  {SHAPE_SYMBOL[s]}
                </button>
              ))}
            </div>
          )}
          <div style={styles.handScroller} aria-label="Your Whot cards">
            <div style={styles.hand}>
            {me.cards.map((id) => (
              <WhotCardView
                key={id}
                card={getWhotCard(id)}
                width={60}
                playable={playable.has(id)}
                onClick={() => handlePlay(id)}
              />
            ))}
            </div>
          </div>
          <button
            style={{...styles.marketBtn, opacity: disabled ? 0.45 : 1}}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (state.marketCount === 0 && playable.size > 0) { setFeedback('You still have a legal card in your hand. Play it first; the Market is only for when you cannot match.'); play('error', 0.3); return; }
              setFeedback('');
              play('card-deal', 0.4);
              onMove({
                type: 'play',
                player: me.playerId,
                payload: { type: 'market', count: state.marketCount > 0 ? state.marketCount : 1 },
                ts: Date.now(),
              });
            }}
          >
            Market
          </button>
        </>
      }
    />
  );
}

function WhotCardView({
  card,
  width = 64,
  playable,
  onClick,
}: {
  card: import('./types').WhotCard | null;
  width?: number;
  playable?: boolean;
  onClick?: () => void;
}) {
  const height = width * 1.45;

  if (!card) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: width * 0.12,
          background: '#2A2635',
          border: `2px solid ${tokens.bg.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.accent.gold,
          fontSize: width * 0.3,
        }}
      >
        ✦
      </div>
    );
  }

  const color = SHAPE_COLOR[card.shape];

  return (
    <button
      onClick={onClick}
      style={{
        width,
        height,
        padding: 0,
        borderRadius: width * 0.12,
        background: '#F5F2EA',
        border: `2px solid ${playable ? tokens.accent.gold : tokens.bg.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: height * 0.08,
        paddingBottom: height * 0.08,
        boxShadow: playable
          ? `0 4px 12px rgba(0,0,0,0.4), 0 0 10px ${tokens.accent.gold}44`
          : '0 2px 6px rgba(0,0,0,0.5)',
        transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: playable ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: width * 0.22, fontWeight: 700, color: '#1A1720' }}>
        {card.number}
      </span>
      <span style={{ fontSize: width * 0.5, color, lineHeight: 1 }}>
        {card.shape === 'whot' ? 'W' : SHAPE_SYMBOL[card.shape]}
      </span>
      <span
        style={{
          fontSize: width * 0.22,
          fontWeight: 700,
          color: '#1A1720',
          transform: 'rotate(180deg)',
        }}
      >
        {card.number}
      </span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  opponent: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: '4px 12px',
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.pill,
  },
  oppBacks: { display: 'flex', gap: 2, maxWidth: 150, overflow: 'hidden' },
  opponentActive: { borderColor: tokens.accent.gold, boxShadow: `0 0 18px ${tokens.accent.gold}22` },
  cardBack: { width: 16, height: 23, borderRadius: 3, background: '#2A2635', border: '1px solid #514b60', flexShrink: 0 },
  oppLabel: { fontSize: tokens.size.xs, color: tokens.text.secondary },
  oppCount: { fontSize: tokens.size.xs, color: tokens.text.primary, fontWeight: 600 },
  required: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: tokens.text.secondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  shapePicker: {
    display: 'flex',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  shapeBtn: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.sm,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    fontSize: 24,
  },
  handScroller: { width: '100%', maxWidth: 'min(100%, 980px)', overflowX: 'auto', overflowY: 'hidden', padding: '18px 8px 10px', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' },
  hand: { display: 'flex', gap: 7, justifyContent: 'center', minWidth: 'max-content', padding: '0 10px 4px' },
  feedback: { display:'flex', flexDirection:'column', gap:4, maxWidth:460, margin:'0 auto 8px', padding:'9px 12px', borderRadius:12, border:'1px solid #d9a64e', background:'rgba(40,27,15,.94)', color:'#fff0d0', fontSize:12, lineHeight:1.45, textAlign:'center' },
  marketBtn: {
    marginTop: tokens.space.sm,
    padding: '8px 24px',
    borderRadius: tokens.radius.md,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    color: tokens.text.primary,
    fontSize: tokens.size.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
};