import { useEffect, useRef, useState } from 'react';
import type { Move } from '../../core/types';
import type { VitaMahjongMove } from './index';
import type { VitaMahjongState, VitaTile } from './types';
import { canMatch, isFree, findMatches, trayHasMatch } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

const BOARD_W = 820;
const BOARD_H = 520;
const TILE_W = 56;
const TILE_H = 64;
const X_GAP = 50;
const Y_GAP = 57;

export function VitaMahjongBoard({ state, onMove, disabled }: { state: VitaMahjongState; onMove: (m: Move<VitaMahjongMove>)=>void; disabled?: boolean }) {
  const [scale, setScale] = useState(1);
  const [praise, setPraise] = useState<{title:string; detail:string; id:number} | null>(null);
  const [feedback, setFeedback] = useState('');
  const matchTimes = useRef<number[]>([]);
  const previousMatches = useRef(state.matches);
  const praiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hintSet = new Set(state.hintPair ?? []);
  const matches = findMatches(state.tiles);

  useEffect(() => {
    if (state.matches < previousMatches.current) { matchTimes.current = []; }
    if (state.matches > previousMatches.current) {
      const now = Date.now();
      matchTimes.current = [...matchTimes.current, now].filter(t => now - t <= 10000);
      const count = matchTimes.current.length;
      let title = '';
      let detail = '';
      if (count >= 5) { title = 'UNSTOPPABLE'; detail = 'Five matches in ten seconds!'; }
      else if (count >= 4) { title = 'AMAZING'; detail = 'Four matches in a flash!'; }
      else if (count >= 3) { title = 'SHARP HANDS'; detail = 'Three matches in under 10 seconds!'; }
      else if (state.combo >= 2) { title = 'QUICK EYES'; detail = `Combo ×${state.combo} · bonus points earned`; }
      else { title = 'NICE MATCH'; detail = '+100 points'; }
      if (praiseTimer.current) clearTimeout(praiseTimer.current);
      setPraise({ title, detail, id: now });
      praiseTimer.current = setTimeout(() => setPraise(null), 1900);
    }
    previousMatches.current = state.matches;
  }, [state.matches, state.combo]);

  useEffect(() => () => { if (praiseTimer.current) clearTimeout(praiseTimer.current); }, []);

  useEffect(() => {
    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      const availableWidth = Math.max(240, (rect?.width ?? window.innerWidth) - 20);
      const availableHeight = Math.max(250, (rect?.height ?? window.innerHeight) - 165);
      setScale(Math.min(1, availableWidth / BOARD_W, availableHeight / BOARD_H));
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' && rootRef.current ? new ResizeObserver(update) : null;
    if (rootRef.current) observer?.observe(rootRef.current);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const handle = (tile: VitaTile) => {
    if (disabled) return;
    if (tile.removed || tile.inTray || !isFree(tile,state.tiles)) { setFeedback('That tile is covered, already in the tray, or no longer available. Choose a free tile.'); play('error',.2); return; }
    const partner = trayHasMatch(tile, state.tray, state.tiles);
    if (state.tray.length >= 4 && !partner) { setFeedback('The tray is full. Choose a tile that matches one already in the tray, or use the available tray action.'); play('error',.2); return; }
    setFeedback('');
    onMove({type:'tap',player:state.playerId,payload:{action:'tap',tileId:tile.id},ts:Date.now()});
    play(partner ? 'tile-place' : 'button-tap', partner ? .35 : .2);
  };

  const action = (payload: VitaMahjongMove) => onMove({ type: payload.action, player: state.playerId, payload, ts: Date.now() });
  const trayTiles = state.tray.map(id => state.tiles.find(t => t.id === id)).filter((t): t is VitaTile => !!t);

  return <div ref={rootRef} style={styles.root}>
    <style>{'@keyframes vitaPraiseIn{from{opacity:0;transform:translateY(5px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}'}</style>
    {feedback && <div role="status" aria-live="polite" style={styles.feedbackToast}>{feedback}</div>}
    {praise && <div key={praise.id} role="status" aria-live="polite" style={styles.praiseToast}><span style={styles.praiseSpark}>✦</span><strong>{praise.title}</strong><span>{praise.detail}</span></div>}

    <div style={styles.header}>
      <span style={styles.stat}><b>VITA MAHJONG</b></span>
      <span style={styles.stat}>{state.tiles.filter(t=>!t.removed).length} remaining</span>
      <span style={styles.stat}>Pairs {state.matches}</span>
      <span style={{...styles.stat,color:tokens.accent.gold}}>Score {state.score}</span>
      <span style={{...styles.stat,color:tokens.accent.jade}}>Combo ×{state.combo} · Best ×{state.bestCombo}</span>
      <span style={{...styles.stat,color:tokens.accent.gold}}>Hints {state.hints}</span>
      <span style={{...styles.stat,color:tokens.accent.jade}}>Shuffles {state.shuffles}</span>
    </div>

    <div style={styles.trayWrap} aria-label="Four-slot tray">
      <div style={styles.trayTitle}>MATCH TRAY</div>
      <div style={styles.tray}>
        {Array.from({length:4}, (_,i) => {
          const tile = trayTiles[i];
          const hinted = !!tile && hintSet.has(tile.id);
          return <div key={i} style={{...styles.slot, ...(tile ? styles.slotFilled : {}), boxShadow:hinted?`0 0 16px ${tokens.accent.gold}`:'none'}}>
            {tile ? <span style={styles.trayTile}>{tile.label}</span> : <span style={styles.slotNumber}>{i+1}</span>}
          </div>;
        })}
      </div>
      <div style={styles.trayHint}>{state.combo > 1 ? `Combo ×${state.combo}! Keep matching for bonus points.` : 'Tap a free tile to collect it. Match pairs quickly to build a combo.'}</div>
    </div>

    <div style={{...styles.boardViewport, height: BOARD_H * scale + 18}}>
      <div style={{...styles.boardScaled, width: BOARD_W * scale, height: BOARD_H * scale}}>
        <div style={{...styles.board, transform:`scale(${scale})`}}>
          {state.tiles.filter(t=>!t.removed && !t.inTray).sort((a,b)=>a.layer-b.layer).map(tile=>{
            const open=isFree(tile,state.tiles), hinted=hintSet.has(tile.id), trayPartner = trayTiles.some(t=>canMatch(t,tile));
            return <button key={tile.id} onClick={()=>handle(tile)} aria-label={`${tile.label}${open?' free':''}`} style={{...styles.tile,left:tile.x*X_GAP+tile.layer*5,top:tile.y*Y_GAP+tile.layer*5,zIndex:tile.layer*1000+Math.round(tile.y*10)+Math.round(tile.x),background:open?'linear-gradient(180deg,#fff8df,#ead9ad)':'linear-gradient(180deg,#d3c49c,#b5a57c)',borderColor:hinted||trayPartner?tokens.accent.gold:'#8d7c59',boxShadow:hinted?`0 0 18px ${tokens.accent.gold}dd`:trayPartner?`0 0 14px ${tokens.accent.jade}cc`:'2px 4px 7px rgba(0,0,0,.4)',transform:hinted?'translateY(-3px)':'none',opacity:open?1:.92}}>{tile.label}</button>;
          })}
        </div>
      </div>
    </div>
    <div style={styles.controls}>
      <button style={styles.controlButton} aria-label="Undo last move" disabled={disabled||!state.history.length} onClick={()=>action({action:'undo'})}>Undo</button>
      <button style={styles.controlButton} disabled={disabled||state.hints<=0||(matches.length===0&&state.tray.length===0)} onClick={()=>action({action:'hint'})}>Hint · {state.hints}</button>
      <button style={styles.controlButton} disabled={disabled||state.shuffles<=0} onClick={()=>action({action:'shuffle',seed:Date.now()})}>Shuffle · {state.shuffles}</button>
    </div>
  </div>;
}

const styles:Record<string,React.CSSProperties>={
 feedbackToast:{position:'absolute',zIndex:9,top:34,left:'50%',transform:'translateX(-50%)',width:'min(420px,90%)',padding:'9px 12px',borderRadius:11,background:'#2c2117',border:'1px solid #b78a4a',color:'#fff0d0',fontSize:12,lineHeight:1.4,textAlign:'center',boxShadow:'0 8px 22px #0006'},
 praiseToast:{alignSelf:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',padding:'9px 16px',borderRadius:999,background:'linear-gradient(135deg,#fff3c6,#e5c06d)',border:'1px solid #ffe7a0',color:'#3a2b16',boxShadow:'0 8px 22px rgba(0,0,0,.3)',fontSize:'clamp(11px,3vw,14px)',animation:'vitaPraiseIn 180ms ease-out',zIndex:5,flexShrink:0},
 praiseSpark:{fontSize:18,color:'#a36a12'},
 root:{width:'100%',height:'100%',minHeight:0,minWidth:0,display:'flex',flexDirection:'column',gap:6,padding:'clamp(4px,1.2vw,10px)',boxSizing:'border-box',overflow:'hidden'},
 header:{display:'flex',justifyContent:'center',gap:'4px 12px',color:tokens.text.secondary,fontSize:'clamp(9px,2.5vw,12px)',letterSpacing:.6,flexWrap:'wrap',textTransform:'uppercase',lineHeight:1.2},
 stat:{whiteSpace:'nowrap'},
 trayWrap:{display:'flex',flexDirection:'column',alignItems:'center',gap:4},
 trayTitle:{fontSize:11,fontWeight:900,letterSpacing:2,color:tokens.text.secondary},
 tray:{display:'flex',gap:'clamp(3px,1vw,8px)',padding:'5px 7px',borderRadius:14,background:'linear-gradient(180deg,#173e34,#102a25)',border:'2px solid #9b7544',boxShadow:'inset 0 0 18px rgba(0,0,0,.35)'},
 slot:{width:'clamp(44px,14vw,62px)',height:'clamp(38px,11vw,52px)',borderRadius:9,border:'2px dashed rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)',boxSizing:'border-box'},
 slotFilled:{borderStyle:'solid',background:'linear-gradient(180deg,#fff8df,#ead9ad)'},
 slotNumber:{fontSize:11,color:'rgba(255,255,255,.35)',fontWeight:800},
 trayTile:{fontSize:'clamp(16px,5vw,22px)',fontWeight:900,color:'#201b17'},
 trayHint:{fontSize:'clamp(9px,2.5vw,10px)',textAlign:'center',padding:'0 4px',color:tokens.text.muted},
 boardViewport:{flex:'1 1 auto',minHeight:0,display:'flex',justifyContent:'center',alignItems:'center',overflow:'hidden'},
 boardScaled:{position:'relative',flex:'0 0 auto'},
 board:{position:'absolute',left:0,top:0,width:BOARD_W,height:BOARD_H,borderRadius:20,background:'radial-gradient(circle,#2e725c,#173e34)',border:'8px solid #9b7544',boxShadow:'inset 0 0 45px rgba(0,0,0,.4)',transformOrigin:'top left'},
 tile:{position:'absolute',width:TILE_W,height:TILE_H,border:'2px solid',borderRadius:7,fontSize:20,fontWeight:900,color:'#201b17',fontFamily:tokens.font.display,cursor:'pointer',transition:'transform 150ms ease,box-shadow 150ms ease'},
 controls:{display:'flex',justifyContent:'center',gap:6,flexWrap:'wrap',flexShrink:0},
 controlButton:{minHeight:40,padding:'9px 14px',borderRadius:11,border:'1px solid rgba(255,255,255,.16)',background:'linear-gradient(180deg,#253f37,#162b26)',color:'#f5f0df',fontWeight:800,fontSize:12,letterSpacing:.3,boxShadow:'0 3px 10px rgba(0,0,0,.18)'},
};
