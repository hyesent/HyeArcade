import { GAME_GUIDES } from './game-guides';
import { tokens } from '../theme/tokens';

export function GameGuide({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const guide = GAME_GUIDES[gameId];
  if (!guide) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="game-guide-title" style={styles.overlay} onClick={onClose}>
    <section style={styles.sheet} onClick={e => e.stopPropagation()}>
      <header style={styles.header}><div><span style={styles.eyebrow}>PLAYER'S HANDBOOK</span><h2 id="game-guide-title" style={styles.title}>{guide.title}</h2><p style={styles.intro}>{guide.goal}</p></div><button type="button" onClick={onClose} aria-label="Close how to play" style={styles.close}>×</button></header>
      <div style={styles.content}>
        <section style={styles.section}><h3>1. Setup</h3><p>{guide.setup}</p></section>
        <section style={styles.section}><h3>2. Your turn</h3><ol>{guide.turn.map((item, i) => <li key={i}>{item}</li>)}</ol></section>
        <section style={styles.section}><h3>3. Rules to know</h3><ul>{guide.rules.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
        <section style={styles.section}><h3>4. Controls and indicators</h3><ul>{(guide.controls ?? ['Tap a legal square, tile, card, or action on the game board to make a move.','Use the on-screen action buttons for special actions such as rolling, drawing, passing, or asking for a hint when those actions are available.','The active-player indicator, score area, move feedback, and recent-activity log help you understand the current state.']).map((item, i) => <li key={i}>{item}</li>)}</ul></section>
        <section style={styles.section}><h3>5. How to win</h3><p>{guide.win}</p></section>
        <section style={styles.section}><h3>Strategy tips</h3><ul>{guide.tips.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
        <section style={styles.section}><h3>Common mistakes</h3><ul>{(guide.commonMistakes ?? ['Trying to make a move that is not legal in the current position or phase.','Forgetting a forced move, special rule, or turn restriction.','Ignoring move feedback or the current score before committing to an action.']).map((item, i) => <li key={i}>{item}</li>)}</ul></section>
      </div>
      <footer style={styles.footer}><span>Use the highlighted legal moves and on-screen prompts during play.</span><button type="button" onClick={onClose} style={styles.done}>Got it</button></footer>
    </section>
  </div>;
}
const styles: Record<string, React.CSSProperties> = {
 overlay:{position:'fixed',inset:0,zIndex:80,background:'#05070bd9',display:'flex',alignItems:'center',justifyContent:'center',padding:'max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))',boxSizing:'border-box'},
 sheet:{width:'min(680px,100%)',maxHeight:'min(88dvh,900px)',display:'flex',flexDirection:'column',background:'rgba(30,27,40,.96)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',color:tokens.text.primary,border:'1px solid rgba(255,255,255,.15)',borderRadius:22,overflow:'hidden',boxShadow:'0 24px 80px #0008'},
 header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,padding:'20px 20px 14px',borderBottom:`1px solid ${tokens.bg.border}`},
 eyebrow:{fontSize:10,letterSpacing:2,fontWeight:800,color:tokens.accent.gold},title:{fontSize:24,lineHeight:1.2,margin:'5px 0 8px'},intro:{fontSize:14,lineHeight:1.5,color:tokens.text.secondary,margin:0},
 close:{width:42,height:42,flexShrink:0,borderRadius:12,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.raised,color:tokens.text.primary,fontSize:25},
 content:{padding:'6px 20px 18px',overflowY:'auto',overscrollBehavior:'contain'},section:{padding:'12px 0',borderBottom:`1px solid ${tokens.bg.border}`},
 note:{padding:12,marginTop:12,borderRadius:12,background:tokens.bg.raised,border:`1px solid ${tokens.bg.border}`,fontSize:12,lineHeight:1.5,color:tokens.text.secondary},
 footer:{padding:'12px 20px calc(12px + env(safe-area-inset-bottom))',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,borderTop:`1px solid ${tokens.bg.border}`,fontSize:11,color:tokens.text.muted},done:{border:0,borderRadius:12,padding:'11px 18px',background:tokens.accent.gold,color:tokens.text.inverse,fontWeight:800,whiteSpace:'nowrap'},
};
