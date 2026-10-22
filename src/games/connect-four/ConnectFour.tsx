import type { Move } from '../../core/types';
import type { ConnectFourState, DropMove } from './types';
import { findWin, isFull } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: ConnectFourState;
  onMove: (move: Move<DropMove>) => void;
  disabled?: boolean;
}

const RED = '#FF5C7A';
const YELLOW = '#E8B95C';

export function ConnectFourBoard({ state, onMove, disabled }: Props) {
  const win = findWin(state.board, state.cols, state.rows, 4);
  const winningLine = win?.line ?? [];
  const currentId = state.playerIds[state.turn];
  const draw = !win && isFull(state.board);
  const winningStart = win?.line[0]; const winningEnd = win?.line[win.line.length - 1];

  const handleDrop = (col: number) => {
    if (disabled) return;
    onMove({
      type: 'drop',
      player: currentId,
      payload: { col },
      ts: Date.now(),
    });
  };

  return (
    <div style={styles.cabinet}>
      <div style={styles.dropRail}>{Array.from({length: state.cols}).map((_,c)=><button key={c} style={styles.dropButton} disabled={disabled || isColumnFull(state,c)} onClick={()=>handleDrop(c)}>▼</button>)}</div>
    <div style={styles.grid}>
      {Array.from({ length: state.cols }).map((_, c) => {
        const canPlay = !disabled && !isColumnFull(state, c);
        return (
          <button
            key={c}
            style={{
              ...styles.column,
              cursor: canPlay ? 'pointer' : 'default',
            }}
            onPointerDown={(e) => {
              if (canPlay) e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => {
              if (!canPlay) {
                play('error', 0.3);
                return;
              }
              handleDrop(c);
            }}
          >
            {Array.from({ length: state.rows }).map((_, r) => {
              const i = r * state.cols + c;
              const cell = state.board[i];
              const isWinning = winningLine.includes(i);
              return (
                <span key={r} style={styles.slot}>
                  {cell && (
                    <span
                      style={{
                        ...styles.piece,
                        background: cell === 'R' ? RED : YELLOW,
                        boxShadow: isWinning
                          ? `0 0 20px ${cell === 'R' ? RED : YELLOW}`
                          : 'inset 0 -3px 6px rgba(0,0,0,0.3)',
                        animation:
                          i === state.lastDrop
                            ? 'hye-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                            : undefined,
                      }}
                    />
                  )}
                </span>
              );
            })}
          </button>
        );
      })}
      {win && winningStart !== undefined && winningEnd !== undefined && <svg viewBox={`0 0 ${state.cols * 100 + (state.cols - 1) * 8 + 28} ${state.rows * 100 + (state.rows - 1) * 8 + 28}`} preserveAspectRatio="none" aria-label="Winning four highlighted" style={styles.winningOverlay}>
        <line x1={14 + (winningStart % state.cols) * 108 + 50} y1={14 + Math.floor(winningStart / state.cols) * 108 + 50} x2={14 + (winningEnd % state.cols) * 108 + 50} y2={14 + Math.floor(winningEnd / state.cols) * 108 + 50} stroke="#fff7cf" strokeWidth="8" strokeLinecap="round" opacity=".95" />
        {win.line.map(index => <circle key={index} cx={14 + (index % state.cols) * 108 + 50} cy={14 + Math.floor(index / state.cols) * 108 + 50} r="38" fill="none" stroke="#fff7cf" strokeWidth="5" />)}
      </svg>}
    </div>
    {(win || draw) && <div role="status" aria-live="polite" style={styles.resultBanner}>{win ? `${win.winner === 'R' ? 'RED' : 'YELLOW'} WINS — THE WINNING FOUR ARE HIGHLIGHTED` : 'DRAW — BOARD FULL'}</div>}
    <div style={styles.releaseBar}>CONNECT FOUR • DROP A DISC INTO A COLUMN</div>
    </div>
  );
}

function isColumnFull(state: ConnectFourState, col: number): boolean {
  for (let r = 0; r < state.rows; r++) {
    if (state.board[r * state.cols + col] === null) return false;
  }
  return true;
}

const styles: Record<string, React.CSSProperties> = {
  cabinet: { width:'100%', maxWidth:720, padding:'14px 14px 10px', borderRadius:22, background:'linear-gradient(145deg,#496bc8,#18306f)', boxShadow:'0 18px 40px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.22)' },
  dropRail: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, padding:'0 8px 8px' },
  dropButton: { border:0, background:'transparent', color:'#dbe5ff', fontSize:16, cursor:'pointer', minHeight:22 },
  winningOverlay: { position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible' },
  resultBanner: { width:'100%', marginTop:8, padding:'11px 14px', borderRadius:13, textAlign:'center', fontSize:12, fontWeight:1000, letterSpacing:1, color:'#211a0b', background:'linear-gradient(135deg,#fff0a6,#e8b95c)', border:'1px solid rgba(255,255,255,.6)', boxShadow:'0 8px 20px rgba(0,0,0,.2)' },
  releaseBar: { marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(0,0,0,.18)', color:'#eaf0ff', fontSize:11, letterSpacing:1.5, textAlign:'center', fontWeight:700 },
  grid: {
    position:'relative',
    display: 'flex',
    gap: 6,
    width: '100%',
    height: '100%',
    padding: tokens.space.sm,
    background: '#24499b',
    borderRadius: 12,
    transition: 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'transparent',
    border: 'none',
    padding: 0,
    transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  slot: {
    flex: 1,
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    background: '#14121C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
  },
  piece: {
    width: '80%',
    height: '80%',
    borderRadius: '50%',
  },
};