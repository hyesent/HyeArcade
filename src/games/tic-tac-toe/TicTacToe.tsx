import type { Move } from '../../core/types';
import type { TicTacToeState, PlaceMove } from './types';
import { getWinner, isDraw } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface TicTacToeProps { state: TicTacToeState; onMove: (move: Move<PlaceMove>) => void; disabled?: boolean; }

export function TicTacToeBoard({ state, onMove, disabled }: TicTacToeProps) {
  const win = getWinner(state.board); const winningLine = win?.line ?? []; const draw = isDraw(state.board);
  const currentPlayerId = state.playerIds[state.turn];
  const handleClick = (index:number) => {
    if (disabled || state.board[index] !== null) { if (state.board[index] !== null) play('error', .3); return; }
    onMove({type:'place', player:currentPlayerId, payload:{index}, ts:Date.now()});
  };
  return <div style={styles.wrap} aria-label="Tic-Tac-Toe board">
    <div style={styles.title}>TIC·TAC·TOE</div>
    <div style={styles.board}>
      <svg viewBox="0 0 300 300" style={styles.svg} aria-hidden="true">
        <defs><filter id="tttShadow"><feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".35"/></filter></defs>
        <rect x="8" y="8" width="284" height="284" rx="24" fill="#18302c" stroke="#b47a3c" strokeWidth="8" filter="url(#tttShadow)"/>
        {[111,189].map(v=><g key={v}><line x1={v} y1="34" x2={v} y2="266" stroke="#d9c39a" strokeWidth="8" strokeLinecap="round"/><line x1="34" y1={v} x2="266" y2={v} stroke="#d9c39a" strokeWidth="8" strokeLinecap="round"/></g>)}
      </svg>
      <div style={styles.cells}>{state.board.map((cell,i)=>{
        const isWinning=winningLine.includes(i);
        return <button key={i} aria-label={`cell ${i+1}`} disabled={disabled||cell!==null} onClick={()=>handleClick(i)} style={{...styles.cell,...(isWinning?styles.winCell:{})}}>
          {cell && <span style={{...styles.mark,color:cell==='X'?tokens.accent.ember:tokens.accent.violet}}>{cell}</span>}
        </button>;
      })}</div>
      {winningLine.length===3 && <svg viewBox="0 0 300 300" style={styles.winningOverlay} aria-label="Winning line highlighted"><line x1={72+(winningLine[0]%3)*78} y1={72+Math.floor(winningLine[0]/3)*78} x2={72+(winningLine[2]%3)*78} y2={72+Math.floor(winningLine[2]/3)*78} stroke="#fff0a6" strokeWidth="12" strokeLinecap="round"/><circle cx={72+(winningLine[0]%3)*78} cy={72+Math.floor(winningLine[0]/3)*78} r="13" fill="none" stroke="#fff0a6" strokeWidth="5"/><circle cx={72+(winningLine[1]%3)*78} cy={72+Math.floor(winningLine[1]/3)*78} r="13" fill="none" stroke="#fff0a6" strokeWidth="5"/><circle cx={72+(winningLine[2]%3)*78} cy={72+Math.floor(winningLine[2]/3)*78} r="13" fill="none" stroke="#fff0a6" strokeWidth="5"/></svg>}
    </div>
    {(win || draw) && <div role="status" aria-live="polite" style={styles.resultBanner}>{win ? `${win.winner} WINS — WINNING LINE HIGHLIGHTED` : 'DRAW — BOARD FULL'}</div>}
  </div>;
}
const styles:Record<string,React.CSSProperties>={
 wrap:{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10},title:{fontFamily:tokens.font.display,fontWeight:900,letterSpacing:4,fontSize:16,opacity:.8},board:{position:'relative',width:'min(76vw,460px)',aspectRatio:'1',filter:'drop-shadow(0 16px 22px rgba(0,0,0,.28))'},svg:{position:'absolute',inset:0,width:'100%',height:'100%'},winningOverlay:{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'},resultBanner:{width:'min(76vw,460px)',padding:'11px 14px',borderRadius:13,textAlign:'center',fontSize:12,fontWeight:1000,letterSpacing:1,color:'#211a0b',background:'linear-gradient(135deg,#fff0a6,#e8b95c)',border:'1px solid rgba(255,255,255,.6)',boxShadow:'0 8px 20px rgba(0,0,0,.2)'},cells:{position:'absolute',inset:'11%',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'repeat(3,1fr)'},cell:{background:'transparent',border:0,borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},winCell:{background:'rgba(255,211,106,.14)',boxShadow:'inset 0 0 24px rgba(255,211,106,.22)'},mark:{fontFamily:tokens.font.display,fontWeight:900,fontSize:'clamp(42px,10vw,78px)',lineHeight:1,textShadow:'0 5px 10px rgba(0,0,0,.3)'}
};
