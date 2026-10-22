import type { Move } from '../../core/types';
import type { GomokuState, PlaceMove } from './types';
import { findFive, isFull } from './logic';
import { play } from '../../theme/sounds';
import type React from 'react';

interface Props {
  state: GomokuState;
  onMove: (move: Move<PlaceMove>) => void;
  disabled?: boolean;
}

export function GomokuBoard({ state, onMove, disabled }: Props) {
  const win = findFive(state.board, state.size); const winning = win?.line ?? []; const currentId = state.playerIds[state.turn]; const draw = !win && isFull(state.board);
  const size=state.size as number; const cell=44; const pad=28; const boardPx=cell*(size-1)+pad*2;
  const handleClick=(i:number)=>{if(disabled||state.board[i]!==null){if(state.board[i]!==null)play('error',0.3);return;}onMove({type:'place',player:currentId,payload:{index:i},ts:Date.now()});};
  const starSet=new Set<string>(); for(let r=0;r<size;r++)for(let c=0;c<size;c++){if((r===3||r===size-4)&&(c===3||c===size-4))starSet.add(`${r},${c}`);if(r===Math.floor(size/2)&&c===Math.floor(size/2))starSet.add(`${r},${c}`);}
  return <div style={{width:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:10}}>
    <svg viewBox={`0 0 ${boardPx} ${boardPx}`} style={{width:'min(98vw, calc(100dvh - 200px), 760px)',aspectRatio:'1/1',display:'block',filter:'drop-shadow(0 18px 30px rgba(0,0,0,.38))'}} role="img" aria-label={`${size} by ${size} Gomoku board`}>
      <defs><linearGradient id="gomokuWood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c99857"/><stop offset=".5" stopColor="#e2b873"/><stop offset="1" stopColor="#a96f37"/></linearGradient><filter id="gomokuStone"><feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity=".45"/></filter></defs>
      <rect x="6" y="6" width={boardPx-12} height={boardPx-12} rx="18" fill="url(#gomokuWood)" stroke="#f0d39c" strokeWidth="5"/>
      {Array.from({length:size},(_,i)=><line key={'v'+i} x1={pad+i*cell} y1={pad} x2={pad+i*cell} y2={pad+(size-1)*cell} stroke="#5d3e24" strokeWidth={i===0||i===size-1?2.2:1.5}/>) }
      {Array.from({length:size},(_,i)=><line key={'h'+i} x1={pad} y1={pad+i*cell} x2={pad+(size-1)*cell} y2={pad+i*cell} stroke="#5d3e24" strokeWidth={i===0||i===size-1?2.2:1.5}/>) }
      {Array.from({length:size*size},(_,i)=>{const r=Math.floor(i/size),c=i%size,x=pad+c*cell,y=pad+r*cell,v=state.board[i],w=winning.includes(i);return <g key={i} onClick={()=>handleClick(i)} style={{cursor:!disabled&&!v?'pointer':'default'}}>{!v&&starSet.has(`${r},${c}`)&&<circle cx={x} cy={y} r="4.5" fill="#5d3e24"/>}{v&&<circle cx={x} cy={y} r={cell*.39} fill={v==='B'?'#17130f':'#f7f0df'} stroke={v==='B'?'#080605':'#a68c68'} strokeWidth="2" filter="url(#gomokuStone)"/ >}{v&&i===state.lastMove&&<circle cx={x} cy={y} r="5" fill={v==='B'?'#f2cf65':'#b33d3d'}/>} {w&&<circle cx={x} cy={y} r={cell*.47} fill="none" stroke="#e5bd50" strokeWidth="4"/>}</g>})}
      {Array.from({length:size},(_,i)=><text key={'n'+i} x={pad+i*cell} y={boardPx-8} textAnchor="middle" fontSize="10" fontWeight="800" fill="#5d3e24">{i+1}</text>)}
    </svg>
    {(win || draw) && <div role="status" aria-live="polite" style={styles.resultBanner}>{win ? `${win.winner === 'B' ? 'BLACK' : 'WHITE'} WINS — FIVE IN A ROW HIGHLIGHTED` : 'DRAW — BOARD FULL'}</div>}
  </div>;
}

const styles: Record<string, React.CSSProperties> = { resultBanner:{width:'min(98vw, calc(100dvh - 200px), 760px)',padding:'11px 14px',borderRadius:13,textAlign:'center',fontSize:12,fontWeight:1000,letterSpacing:1,color:'#211a0b',background:'linear-gradient(135deg,#fff0a6,#e8b95c)',border:'1px solid rgba(255,255,255,.6)',boxShadow:'0 8px 20px rgba(0,0,0,.2)'} };
