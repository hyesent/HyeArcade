import type { AyoState } from './types';
import { legalAyoPits } from './logic';
import { tokens } from '../../theme/tokens';

export function AyoBoard({ state, onMove, disabled }: { state: AyoState; onMove: (move: any) => void; disabled: boolean }) {
  const legal = new Set(legalAyoPits(state));
  const pitButton = (i: number, ordinal: number) => {
    const isLegal = legal.has(i) && !disabled;
    const count = state.pits[i];
    return <button key={i} type="button" disabled={!isLegal} onClick={() => onMove({ type: 'sow', player: state.playerIds[state.turn], payload: { pit: i }, ts: Date.now() })} aria-label={`Pit ${ordinal}, ${count} seeds${isLegal ? ', legal move' : ''}`} style={{ ...styles.pit, ...(isLegal ? styles.pitLegal : {}), outline: state.lastPit === i ? `3px solid ${tokens.accent.gold}` : 'none', cursor: isLegal ? 'pointer' : 'default' }}>
      <span style={styles.pitNumber}>{ordinal}</span>
      <span style={styles.count}>{count}</span>
      <span style={styles.seeds} aria-hidden="true">{Array.from({ length: Math.min(count, 12) }, (_, n) => <i key={n} style={{ position:'absolute', width:'clamp(3px,.8vw,6px)', height:'clamp(3px,.8vw,6px)', borderRadius:99, background:'radial-gradient(circle at 30% 25%,#fff0c5,#d9ad62 65%,#835322)', boxShadow:'0 1px 2px #0008', left: `${18 + (n % 4) * 19}%`, top: `${16 + Math.floor(n / 4) * 25}%` }} />)}</span>
    </button>;
  };
  const topIsCurrent = state.turn === 1;
  return <div style={styles.root}>
    <div style={styles.scoreCards}>
      <div style={{...styles.scoreCard, ...(topIsCurrent ? styles.activeScore : {})}}><span style={styles.scoreLabel}>{topIsCurrent ? 'YOUR CAPTURED SEEDS' : 'OPPONENT CAPTURED'}</span><strong style={styles.scoreValue}>{state.captured[topIsCurrent ? 1 : 0]}</strong></div>
      <div style={styles.turnBadge}><span style={styles.turnDot} />{disabled ? 'WAITING FOR TURN' : 'YOUR TURN'}</div>
      <div style={{...styles.scoreCard, ...(!topIsCurrent ? styles.activeScore : {})}}><span style={styles.scoreLabel}>{!topIsCurrent ? 'YOUR CAPTURED SEEDS' : 'OPPONENT CAPTURED'}</span><strong style={styles.scoreValue}>{state.captured[!topIsCurrent ? 0 : 1]}</strong></div>
    </div>
    <div style={styles.boardFrame}>
      <div style={styles.rowHeading}><span>{topIsCurrent ? 'YOUR PITS' : 'OPPONENT PITS'}</span><span>6 PITS · 4 SEEDS EACH AT START</span></div>
      <div style={styles.board}>
        <div style={styles.row}>{[0,1,2,3,4,5].map((n) => pitButton(n, 6 - n))}</div>
        <div style={styles.boardDivider}><span>AYÒ ỌLỌ́PỌ́N</span><span>48 SEEDS</span></div>
        <div style={styles.row}>{[11,10,9,8,7,6].map((n) => pitButton(n, n - 5))}</div>
      </div>
      <div style={styles.rowHeading}><span>{topIsCurrent ? 'OPPONENT PITS' : 'YOUR PITS'}</span><span>Tap a pit on your row to sow</span></div>
    </div>
    <div style={styles.rulesCard}><strong>How a move works</strong><p>Pick up every seed from one of your pits and sow one seed into each following pit, moving anticlockwise. If your last seed leaves exactly 2 or 3 seeds in an opponent pit, capture them and keep capturing backwards while the next opponent pit also has 2 or 3.</p><p>If your opponent has no seeds on their side, feed them when a legal feeding move exists. Your goal is to finish with more captured seeds.</p></div>
  </div>;
}
const styles: Record<string, React.CSSProperties> = {
  root: { width:'100%', maxWidth:760, margin:'0 auto', display:'grid', gap:12, padding:'clamp(6px,2vw,14px)', boxSizing:'border-box', color:tokens.text.primary },
  scoreCards: { display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'stretch', gap:7 },
  scoreCard: { minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center', gap:4, padding:'9px 10px', borderRadius:13, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.035)' },
  activeScore: { borderColor:'rgba(219,179,102,.55)', background:'linear-gradient(145deg,rgba(185,137,67,.16),rgba(255,255,255,.025))' },
  scoreLabel: { fontSize:'clamp(8px,2vw,10px)', letterSpacing:'.7px', fontWeight:800, color:tokens.text.muted, lineHeight:1.2 },
  scoreValue: { fontSize:'clamp(20px,5vw,27px)', lineHeight:1, color:tokens.accent.gold, fontVariantNumeric:'tabular-nums' },
  turnBadge: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'0 8px', borderRadius:999, background:'rgba(35,185,130,.12)', border:'1px solid rgba(35,185,130,.28)', color:tokens.text.primary, fontSize:9, fontWeight:900, letterSpacing:'.7px', whiteSpace:'nowrap' },
  turnDot: { width:6,height:6,borderRadius:99,background:tokens.accent.jade,boxShadow:`0 0 8px ${tokens.accent.jade}` },
  boardFrame: { display:'grid', gap:7, padding:10, borderRadius:22, background:'linear-gradient(145deg,#9b6c3d,#5a371e 58%,#392316)', border:'2px solid #d6b27b', boxShadow:'0 12px 28px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.22)' },
  rowHeading: { display:'flex', justifyContent:'space-between', gap:6, flexWrap:'wrap', padding:'2px 4px', color:'#f2d9ad', fontSize:9, fontWeight:900, letterSpacing:'.65px' },
  board: { display:'grid', gap:9, padding:'10px 8px', borderRadius:16, background:'linear-gradient(180deg,#3d2618,#24170f)', boxShadow:'inset 0 3px 12px #0008' },
  row: { display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:'clamp(4px,1.2vw,9px)' },
  pit: { minWidth:0, aspectRatio:'0.9 / 1', borderRadius:'50%', border:'2px solid #58371e', background:'radial-gradient(circle at 35% 25%,#815934,#3a2415 72%)', boxShadow:'inset 0 5px 10px #0009,0 2px 0 #b98955', position:'relative', display:'grid', placeItems:'center', padding:0, color:'#fff1d6', touchAction:'manipulation', overflow:'hidden' },
  pitLegal: { borderColor:'#f0ca7b', boxShadow:'inset 0 5px 10px #0008,0 0 0 2px rgba(255,213,139,.3),0 0 16px rgba(236,184,92,.25)', background:'radial-gradient(circle at 35% 25%,#956a3c,#4c2e18 72%)' },
  pitNumber: { position:'absolute', top:4, left:0, right:0, fontSize:8, lineHeight:1, fontWeight:800, color:'rgba(255,235,199,.45)', zIndex:3 },
  count: { position:'relative', zIndex:2, fontSize:'clamp(17px,4vw,25px)', fontWeight:900, fontVariantNumeric:'tabular-nums', textShadow:'0 2px 5px #000', pointerEvents:'none' },
  seeds: { position:'absolute', inset:'12%', pointerEvents:'none' },
  boardDivider: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 7px', color:'#d8b07a', fontSize:9, fontWeight:900, letterSpacing:1.2, borderTop:'1px solid rgba(255,255,255,.07)', borderBottom:'1px solid rgba(255,255,255,.07)' },
  rulesCard: { display:'grid', gap:6, padding:'12px 14px', borderRadius:15, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.035)', fontSize:12, lineHeight:1.55, color:tokens.text.secondary },
};
