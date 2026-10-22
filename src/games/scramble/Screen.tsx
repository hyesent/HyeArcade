import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenProps } from '../../core/screen';
import { Cabinet, Marquee, Bezel, Stage, ControlDeck, PlayerPips, TurnBadge, ActionBar } from '../../core/screen';
import type { ScrambleState, ScrambleMove } from './types';
import type { Move } from '../../core/types';

export function ScrambleScreen(props: ScreenProps<ScrambleState>) {
  const { game, session, currentId, isMyTurn, onMove, onReset, onExit, accent } = props;
  const s = session.state;
  const [answer, setAnswer] = useState('');
  const [now, setNow] = useState(Date.now());
  const autoSkipRef = useRef<string>('');
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(id); }, [s.current.startedAt]);
  useEffect(() => setAnswer(''), [s.round, s.turn]);
  const left = Math.max(0, s.current.limitMs - (now - s.current.startedAt));
  const seconds = Math.ceil(left / 1000);
  const submit = () => {
    const move: Move<ScrambleMove> = { type: 'submit', player: currentId!, payload: { action: 'submit', word: answer, elapsedMs: s.current.limitMs - left }, ts: Date.now() };
    onMove(move);
  };
  const hint = () => onMove({ type: 'hint', player: currentId!, payload: { action: 'hint' }, ts: Date.now() });
  const skip = () => onMove({ type: 'skip', player: currentId!, payload: { action: 'skip', elapsedMs: s.current.limitMs - left }, ts: Date.now() });
  const revealed = s.hintLetter ? `HINT: ${s.hintLetter.toUpperCase()}` : 'USE EVERY LETTER';
  const bar = Math.max(0, Math.min(100, left / s.current.limitMs * 100));
  useEffect(() => { const key = `${s.round}-${s.turn}-${s.current.startedAt}`; if (isMyTurn && session.status === 'playing' && left <= 0 && autoSkipRef.current !== key) { autoSkipRef.current = key; skip(); } }, [left, isMyTurn, session.status, s.round, s.turn]);
  const scoreRows = useMemo(() => [...s.playerIds].sort((a,b) => s.scores[b]-s.scores[a]), [s]);
  return <Cabinet accent={accent}>
    <Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset} />
    <Bezel accent={accent} aspectRatio="16 / 9"><Stage accent={accent}>
      <div style={{ width:'min(760px,94%)', display:'grid', gap:18, textAlign:'center' }}>
        <div style={{ fontSize:13, letterSpacing:3, opacity:.7 }}>ROUND {Math.min(s.round,s.totalRounds)} / {s.totalRounds}</div>
        <div style={{ fontSize:'clamp(38px,7vw,72px)', letterSpacing:10, fontWeight:900, textTransform:'uppercase' }}>{s.current.letters}</div>
        <div style={{ height:8, borderRadius:8, background:'rgba(255,255,255,.08)', overflow:'hidden' }}><div style={{ width:`${bar}%`, height:'100%', background:accent, transition:'width .2s linear' }}/></div>
        <div style={{ fontSize:24, fontWeight:800 }}>{seconds}s</div>
        <div style={{ fontSize:18, minHeight:24, letterSpacing:3 }}>{revealed}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <input autoFocus value={answer} onChange={e=>setAnswer(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter')submit()}} disabled={!isMyTurn || session.status!=='playing'} placeholder="TYPE WORD" style={{ padding:'14px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,.18)', background:'rgba(0,0,0,.25)', color:'inherit', fontSize:18, textAlign:'center', letterSpacing:2 }} />
          <button onClick={submit} disabled={!isMyTurn}>SUBMIT</button><button onClick={hint} disabled={!isMyTurn}>HINT −15</button><button onClick={skip} disabled={!isMyTurn}>SKIP</button>
        </div>
      </div>
    </Stage></Bezel>
    <section className="hye-game-overview" aria-label="Word Scramble scoreboard and events">
      <div className="hye-scoreboard"><div className="hye-panel-heading"><span>Player Scores</span><span className="hye-stat-pill">Round {Math.min(s.round,s.totalRounds)} / {s.totalRounds}</span></div>
        <div className="hye-score-grid">{scoreRows.map((id,index)=><article className={`hye-score-card ${id===currentId?'is-active':''}`} key={id}><div className="hye-score-card-top"><span className="hye-score-seat">{index+1}</span><strong>{session.players.find(p=>p.id===id)?.name ?? id}</strong>{id===currentId&&<span className="hye-stat-pill active">TURN</span>}</div><div className="hye-score-metrics"><span>{s.scores[id]} points</span><span>{s.solved[id]} solved</span></div></article>)}</div>
      </div>
      {s.log?.length>0&&<div className="hye-event-feed"><div className="hye-panel-heading"><span>Recent Events</span><span className="hye-stat-pill">{s.log.length} logged</span></div><div className="hye-event-list">{s.log.slice(-5).reverse().map((entry:string,index:number)=><div className="hye-event-row" key={`${index}-${entry}`}><span className="hye-event-number">{s.log.length-index}</span><span>{session.players.reduce((value,p)=>value.replaceAll(p.id,p.name),entry)}</span></div>)}</div></div>}
    </section>
    <ControlDeck accent={accent}><PlayerPips players={session.players} currentId={currentId} onPlayerSelect={props.onOpenPlayerProfile}/><TurnBadge players={session.players} currentId={currentId} status={session.status} result={session.result} isMyTurn={isMyTurn}/><ActionBar onReset={onReset}/></ControlDeck>
  </Cabinet>;
}
