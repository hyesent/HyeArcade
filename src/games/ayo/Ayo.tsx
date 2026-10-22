import type { AyoState } from './types';
import { legalAyoPits } from './logic';
import { tokens } from '../../theme/tokens';

export function AyoBoard({ state, onMove, disabled }: { state: AyoState; onMove: (move: any) => void; disabled: boolean }) {
  const legal = new Set(legalAyoPits(state));
  const player = state.turn;
  const pitButton = (i: number) => {
    const isLegal = legal.has(i) && !disabled;
    return <button key={i} type="button" disabled={!isLegal} onClick={() => onMove({ type: 'sow', player: state.playerIds[player], payload: { pit: i }, ts: Date.now() })} aria-label={`Pit ${i + 1}, ${state.pits[i]} seeds`} style={{ ...styles.pit, opacity: isLegal ? 1 : .7, outline: state.lastPit === i ? `2px solid ${tokens.accent.gold}` : 'none', cursor: isLegal ? 'pointer' : 'default' }}><span style={styles.count}>{state.pits[i]}</span><span style={styles.seeds}>{Array.from({ length: Math.min(state.pits[i], 12) }, (_, n) => <i key={n} style={{ transform: `rotate(${n * 137.5}deg) translateY(-${7 + (n % 3) * 3}px)` }} />)}</span></button>;
  };
  return <div style={styles.root}>
    <div style={styles.score}><span>Captured: <b>{state.captured[1]}</b></span><span>{state.turn === 1 ? 'Your turn' : 'Opponent turn'}</span><span>Captured: <b>{state.captured[0]}</b></span></div>
    <div style={styles.board}>
      <div style={styles.row}>{[0,1,2,3,4,5].map(i => pitButton(i))}</div>
      <div style={styles.row}>{[11,10,9,8,7,6].map(i => pitButton(i))}</div>
    </div>
    <div style={styles.labels}><span>Opponent's row</span><span>Your row</span></div>
    <p style={styles.help}>Tap a pit on your row to sow its seeds anticlockwise. In this Ayoayo ruleset, captures begin when your final seed leaves 2 or 3 seeds in an opponent pit.</p>
  </div>;
}
const styles: Record<string, React.CSSProperties> = {
  root: { width:'100%', display:'grid', gap:12, padding:12, boxSizing:'border-box', color:tokens.text.primary },
  score: { display:'flex', justifyContent:'space-between', gap:6, flexWrap:'wrap', fontSize:12, color:tokens.text.secondary },
  board: { background:'linear-gradient(145deg,#8b6036,#50351e)', border:'5px solid #c59b65', borderRadius:24, padding:'14px 10px', display:'grid', gap:10, boxShadow:'inset 0 2px 8px #0006' },
  row: { display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:6 },
  pit: { minWidth:0, aspectRatio:'0.9 / 1', borderRadius:'50%', border:'1px solid #4b2c18', background:'radial-gradient(circle at 35% 28%,#6b472b,#29180e)', boxShadow:'inset 0 3px 8px #0009,0 2px 0 #d5aa72', position:'relative', display:'grid', placeItems:'center', padding:0, color:'#fff1d6', touchAction:'manipulation' },
  count: { position:'relative', zIndex:2, fontSize:'clamp(14px,3.4vw,20px)', fontWeight:800, textShadow:'0 1px 3px #000' },
  seeds: { position:'absolute', inset:'18%', pointerEvents:'none' },
  labels: { display:'flex', justifyContent:'space-between', color:tokens.text.muted, fontSize:11 },
  help: { margin:0, fontSize:12, lineHeight:1.5, color:tokens.text.muted },
};
