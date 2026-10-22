import { useMemo } from 'react';
import type { ScreenProps } from '../../core/screen';
import { Cabinet, Marquee, Bezel, Stage, ControlDeck, PlayerPips, TurnBadge, ActionBar } from '../../core/screen';
import type { TreasureHuntState, TreasureMove } from './types';
import type { Move } from '../../core/types';

export function TreasureHuntScreen(props: ScreenProps<TreasureHuntState>) {
 const {game,session,currentId,isMyTurn,onMove,onReset,onExit,accent}=props; const s=session.state;
 const lastMine=useMemo(()=>[...s.guesses].reverse().find(g=>g.playerId===currentId),[s.guesses,currentId]);
 const hint=(d:number)=>d===0?'TREASURE!':d<=2?'BURNING':d<=4?'HOT':d<=6?'WARM':d<=9?'COOL':'COLD';
 const guess=(row:number,col:number)=>onMove({type:'guess',player:currentId!,payload:{row,col},ts:Date.now()} as Move<TreasureMove>);
 return <Cabinet accent={accent}><Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset}/>
 <Bezel accent={accent} aspectRatio="1 / 1"><Stage accent={accent}><div style={{width:'min(700px,96%)',display:'grid',gap:12}}>
   <div style={{textAlign:'center'}}><div style={{fontSize:11,letterSpacing:3,opacity:.65}}>TREASURE MAP • 8 × 8 GRID</div><div style={{fontSize:24,fontWeight:900}}>Chart the waters. Find the chest.</div><div style={{fontSize:14,opacity:.75}}>{lastMine ? `Last clue: ${hint(lastMine.distance)} • ${lastMine.distance} squares away` : 'Choose a coordinate to reveal how close you are.'}</div></div>
   <div style={{display:'grid',gridTemplateColumns:'28px repeat(8,1fr)',gridTemplateRows:'28px repeat(8,1fr)',aspectRatio:'1',gap:2,padding:10,borderRadius:18,background:'linear-gradient(135deg,#174d59,#0d2c3a)',border:'5px solid #a87942',boxShadow:'inset 0 0 30px rgba(0,0,0,.35),0 14px 30px rgba(0,0,0,.28)'}}>
    <div/><>{Array.from({length:8},(_,c)=><div key={`c${c}`} style={styles.coord}>{String.fromCharCode(65+c)}</div>)}</>
    {Array.from({length:8},(_,r)=><>{<div key={`r${r}`} style={styles.coord}>{r+1}</div>}{Array.from({length:8},(_,c)=>{const g=s.guesses.find(x=>x.row===r&&x.col===c); return <button key={`${r}-${c}`} disabled={!isMyTurn||!!g||session.status!=='playing'} onClick={()=>guess(r,c)} style={{...styles.cell,background:g?.distance===0?'#e0a43b':g?'rgba(234,248,255,.18)':(r+c)%2?'rgba(36,113,124,.72)':'rgba(42,132,141,.72)'}}>{g?(g.distance===0?'⚓':<span>{g.distance}</span>):<span style={styles.wave}>·</span>}</button>})}</>)}
   </div>
   <div style={{display:'flex',justifyContent:'space-between',fontSize:13,opacity:.75}}><span>Searches: {s.guesses.length}/{s.maxGuesses}</span><span>{isMyTurn?'Your expedition':'Waiting for the hunter'}</span></div>
   {session.status !== 'playing' && s.treasure && s.treasure.row >= 0 && <div role="status" style={{padding:14,borderRadius:14,background:'rgba(224,164,59,.14)',border:'1px solid rgba(224,164,59,.5)',textAlign:'center'}}><strong>Treasure revealed: {String.fromCharCode(65+s.treasure.col)}{s.treasure.row+1}</strong><div style={{fontSize:13,marginTop:5}}>Actual hidden location for this round. {s.guesses.find(g=>g.distance===0) ? `Found by ${session.players.find(p=>p.id===s.guesses.find(g=>g.distance===0)?.playerId)?.name ?? 'a player'}.` : 'No player found it before the search limit.'}</div></div>}
   <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>{s.playerIds.map(id=><span key={id}><b>{session.players.find(p=>p.id===id)?.name}</b> • best {s.bestDistance[id]===Infinity?'—':s.bestDistance[id]}</span>)}</div>
 </div></Stage></Bezel>
 <ControlDeck accent={accent}><PlayerPips players={session.players} currentId={currentId} onPlayerSelect={props.onOpenPlayerProfile}/><TurnBadge players={session.players} currentId={currentId} status={session.status} result={session.result} isMyTurn={isMyTurn}/><ActionBar onReset={onReset}/></ControlDeck>
 </Cabinet>;
}
const styles:Record<string,React.CSSProperties>={coord:{display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:11,color:'#d9c79d'},cell:{border:'1px solid rgba(220,245,245,.16)',borderRadius:5,color:'#fff',fontWeight:900,fontSize:11,cursor:'pointer',boxShadow:'inset 0 0 10px rgba(0,0,0,.12)'},wave:{opacity:.22,fontSize:20}}
