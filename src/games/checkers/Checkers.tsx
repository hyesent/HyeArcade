import { useState } from 'react';
import type { Move } from '../../core/types';
import type { CheckersState, CheckersMove, Cell } from './types';
import { legalMovesFor } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: CheckersState;
  onMove: (move: Move<CheckersMove>) => void;
  disabled?: boolean;
}

const LIGHT = '#E9E1D1';
const DARK = '#27323A';
const RED = '#E85D75';
const BLACK = '#171B22';

export function CheckersBoard({ state, onMove, disabled }: Props) {
  const [feedback, setFeedback] = useState('');
  const isDrafts = state.size === 10;
  const legal = legalMovesFor(state, state.turn);
  const currentId = state.playerIds[state.turn];
  const froms = new Set(legal.map((m) => m.from));

  const handleClick = (i: number) => {
    if (disabled) return;
    const matching = legal.filter((m) => m.to === i);
    if (matching.length === 0) {
      setFeedback(isDrafts ? 'That landing square is not legal. Drafts requires a maximum capture when captures are available; finish the whole capture chain.' : 'That square is not a legal move. If a capture is available, you must capture and continue any forced jump chain.');
      play('error', 0.3);
      return;
    }
    setFeedback('');
    const chosen = matching[0];
    const piece = state.board[chosen.from];
    const targetRow = Math.floor(chosen.to / state.size);
    const promoted = (piece === 'r' && targetRow === 0) || (piece === 'b' && targetRow === state.size - 1);
    onMove({
      type: 'move',
      player: currentId,
      payload: promoted ? { ...chosen, promoted: true } : chosen,
      ts: Date.now(),
    });
  };


  return (
    <div style={styles.root}>
      {feedback && <div role="status" aria-live="polite" style={styles.feedback}>{feedback}</div>}
      <div style={{...styles.frame, ...(isDrafts ? styles.draftsFrame : styles.checkersFrame)}}>
      <div style={{...styles.coordsTop,gridTemplateColumns:`repeat(${state.size},1fr)`}}>{Array.from({length:state.size},(_,i)=>String.fromCharCode(65+i)).map((x)=><span key={x}>{x}</span>)}</div>
      <div
        style={{
          ...styles.board,
          gridTemplateColumns: `repeat(${state.size}, 1fr)`,
          gridTemplateRows: `repeat(${state.size}, 1fr)`,
        }}
      >
        {state.board.map((cell, i) => {
          const r = Math.floor(i / state.size);
          const c = i % state.size;
          const dark = (r + c) % 2 === 1;
          const fromLegal = froms.has(i);
          const isLegalTarget = legal.some((m) => m.to === i);

          return (
            <button
              key={i}
              style={{
                ...styles.cell,
                background: dark ? DARK : LIGHT,
                boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,.045)' : 'inset 0 0 0 1px rgba(20,25,30,.06)',
                cursor:
                  cell && fromLegal && !disabled ? 'pointer' : isLegalTarget ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={() => {
                if (cell && !disabled) {
                  if (!fromLegal) {
                    setFeedback(isDrafts ? 'That piece has no legal move right now. Drafts may require a different piece to complete the maximum capture.' : 'That piece has no legal move right now. Choose a highlighted piece or capture target.');
                    play('error', 0.25);
                    return;
                  }
                  const single = legal.filter((m) => m.from === i);
                  if (single.length === 1) {
                    setFeedback('');
                    const chosen = single[0];
                    const targetRow = Math.floor(chosen.to / state.size);
                    const promoted = (cell === 'r' && targetRow === 0) || (cell === 'b' && targetRow === state.size - 1);
                    onMove({ type: 'move', player: currentId, payload: promoted ? { ...chosen, promoted: true } : chosen, ts: Date.now() });
                  } else {
                    setFeedback(isDrafts ? 'This piece has more than one legal capture route. Choose a highlighted landing square; maximum captures are mandatory.' : 'Choose one of the highlighted legal destinations for this piece.');
                    play('button-tap', 0.2);
                  }
                  return;
                }
                if (isLegalTarget) handleClick(i);
                else if (!cell && !disabled) {
                  setFeedback(isDrafts ? 'That square is not a legal landing. Follow the highlighted maximum-capture route.' : 'That square is not a legal destination. Choose a highlighted landing square.');
                  play('error', 0.25);
                }
              }}
            >
              {cell && <Piece cell={cell} highlighted={fromLegal} />}
              {isLegalTarget && !cell && <Target />}
            </button>
          );
        })}
      </div>
      <div style={{...styles.coordsBottom,gridTemplateColumns:`repeat(${state.size},1fr)`}}>{Array.from({length:state.size},(_,i)=>String.fromCharCode(65+i)).reverse().map((x)=><span key={x}>{x}</span>)}</div>
      </div>
    </div>
  );
}

function Piece({ cell, highlighted }: { cell: Cell; highlighted: boolean }) {
  if (!cell) return null;
  const isRed = cell === 'r' || cell === 'R';
  const king = cell === 'R' || cell === 'B';
  const color = isRed ? RED : BLACK;

  return (
    <div
      style={{
        width: '78%',
        height: '78%',
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, #FFFFFF44 0%, ${color} 40%, ${darken(color)} 100%)`,
        boxShadow: highlighted
          ? `0 0 12px ${tokens.accent.gold}, 0 5px 0 ${darken(color)}, inset 0 -3px 6px rgba(0,0,0,0.4)`
          : `inset 0 -3px 6px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {king && (
        <span
          style={{
            color: tokens.accent.gold,
            fontSize: '50%',
            fontWeight: 700,
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}
        >
          ♛
        </span>
      )}
    </div>
  );
}

function Target() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: '30%',
        borderRadius: '50%',
        background: tokens.accent.gold,
        opacity: 0.5,
        animation: 'hye-glow 1200ms ease-in-out infinite',
      }}
    />
  );
}

function darken(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `#${[r, g, b]
    .map((n) => Math.round(n * 0.55).toString(16).padStart(2, '0'))
    .join('')}`;
}

const styles: Record<string, React.CSSProperties> = {
  feedback: { padding:'8px 12px', borderRadius:10, background:'#30251a', border:'1px solid #b78a4a', color:'#fff0d0', fontSize:12, lineHeight:1.4, textAlign:'center', maxWidth:520 },
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  frame: { width:'min(98vw, calc(100dvh - 190px))', maxWidth:760, boxSizing:'border-box', padding:8, borderRadius:20, background:'linear-gradient(145deg,#9aa8b2 0%,#4b5965 18%,#202831 60%,#11171e 100%)', border:'1px solid rgba(255,255,255,.24)', boxShadow:'0 18px 42px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.2)' },
  draftsFrame: { background:'linear-gradient(145deg,#d9c39a 0%,#7c5a36 25%,#332a25 100%)', border:'1px solid rgba(239,209,155,.45)' },
  checkersFrame: { background:'linear-gradient(145deg,#b9c4ce 0%,#4a5661 25%,#202831 100%)' },
  coordsTop: { display:'grid', gridTemplateColumns:'repeat(8,1fr)', color:'#e9edf0', fontSize:10, fontWeight:800, textAlign:'center', marginBottom:5, letterSpacing:1 },
  coordsBottom: { display:'grid', gridTemplateColumns:'repeat(8,1fr)', color:'#e9edf0', fontSize:10, fontWeight:800, textAlign:'center', marginTop:5, letterSpacing:1 },
  board: {
    display: 'grid',
    width: '100%',
    maxWidth: 'min(96vw, calc(100dvh - 220px))',
    aspectRatio: '1 / 1',
    boxSizing: 'border-box',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 12px 28px rgba(0,0,0,.34)',
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    padding: 0,
    minHeight: 0,
    minWidth: 0,
    aspectRatio: '1 / 1',
  },
};