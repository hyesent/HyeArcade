import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ScreenProps } from '../core/screen';
import { Cabinet, Marquee, Bezel, Stage, ControlDeck, PlayerPips, TurnBadge } from '../core/screen';
import { tokens } from '../theme/tokens';

type Props = ScreenProps<unknown> & { kind: string };

type MonopolyProperty = { name: string; group: string; price: number; rent: number; type: string; id: string };

const palettes: Record<string, string[]> = {
  'monopoly-deal': ['#1f6f5b', '#d9b84c', '#8b2435', '#2d5f8f'],
  scramble: ['#6b4f9e', '#d9b84c', '#4f8c7a', '#b64f65'],
  'treasure-hunt': ['#1d6f74', '#d6a84f', '#7a5130', '#6d8d57'],
  chess: ['#b28a5a', '#6f5136'],
  scrabble: ['#f2c27b', '#d39a4d', '#a76543', '#6e8f5b'],
  mahjong: ['#3c8c73', '#d7b85a', '#a64e4e', '#4f76a3'],
  monopoly: ['#2f7c52', '#d8b45a', '#9b4c6a', '#4f79a8'],
  'pirate-go': ['#214f6f', '#c39b55', '#713e2c', '#4e7d68'],
};

const groupColors: Record<string, string> = {
  Amber: '#d79b37', Azure: '#4aa4d8', Rose: '#c66d9d', Gold: '#e4b84e', Red: '#d95055', Green: '#5ca85f', Navy: '#4d63b8', Purple: '#8d5ab5', Rail: '#5f5b57', utility: '#5a8f84', tax: '#9b6f50', chance: '#d2a23b', chest: '#4f789e', corner: '#7b766d',
};

export function DedicatedGameScreen({ kind, ...props }: Props) {
  const { game, session, currentId, isMyTurn, onMove, onReset, onExit, accent, onOpenPlayerProfile } = props;
  const colors = palettes[kind] ?? [accent, '#d9b84c', '#4e73a8', '#713e2c'];
  const state = session.state as Record<string, unknown>;
  const generalScores = state.scores && typeof state.scores === 'object' ? state.scores as Record<string, number> : null;
  const generalPlayerIds: string[] = Array.isArray(state.playerIds) ? state.playerIds as string[] : session.players.map(player => player.id);
  const canAct = isMyTurn && session.status === 'playing';
  const [tradeTo, setTradeTo] = useState('');
  const [offerProperty, setOfferProperty] = useState('');
  const [requestProperty, setRequestProperty] = useState('');
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const coreKind = kind === 'chess' || kind === 'pirate-go' || kind === 'scrabble' || kind === 'mahjong';
  const action = session.status === 'playing' ? 'Take Action' : 'Play Again';
  const boardId = session.boardId ?? 'hye-city';
  const city = boardId === 'port-royale' ? 'Port Royale' : 'Hye City';
  const log = Array.isArray(state.log) ? state.log as string[] : [];
  const progress = typeof state.progress === 'number' ? state.progress : 0;
  const properties = Array.isArray(state.properties) ? state.properties as MonopolyProperty[] : [];
  const owned = (state.owned ?? {}) as Record<string, string | null>;
  const positions = (state.positions ?? {}) as Record<string, number>;

  const sendAction = () => {
    if (!canAct) return;
    onMove({ type: 'action', player: currentId ?? session.players[0].id, payload: { action: 'action' }, ts: Date.now() });
  };
  const monopolyMove = (action: string, amount?: number, propertyId?: string, extra?: Record<string, unknown>) => {
    const pendingPurchase = (state.pendingPurchaseOffer ?? null) as {from:string;to:string;propertyId:string;amount:number;attempt:number}|null;
    const actor = (action==='accept_purchase'||action==='reject_purchase') ? (pendingPurchase?.to ?? currentId ?? session.players[0].id) : (currentId ?? session.players[0].id);
    if (!canAct && !['accept_trade','reject_trade','accept_purchase','reject_purchase'].includes(action)) return;
    const type = ['auction','bid','pass'].includes(action) ? 'auction' : ['trade','accept_trade','reject_trade','offer_trade','offer_purchase','accept_purchase','reject_purchase','end_offer'].includes(action) ? 'trade' : action === 'buy' || action === 'decline' || action === 'build' ? action : 'roll';
    onMove({ type, player: actor, payload: { action, ...(amount === undefined ? {} : { amount }), ...(propertyId ? { propertyId } : {}), ...(extra ?? {}) }, ts: Date.now() });
  };
  const phase = String(state.phase ?? 'roll');
  const auction = state.auction as { highBid?: number; propertyId?: string } | null;
  const money = (state.money ?? {}) as Record<string, number>;
  const meMoney = currentId ? money[currentId] ?? 0 : 0;
  const landedProperty = phase === 'buy' ? properties[positions[currentId ?? ''] ?? -1] : undefined;
  const houses = (state.houses ?? {}) as Record<string, number>;
  const mortgages = (state.mortgages ?? {}) as Record<string, boolean>;
  const ownedBuilds = currentId ? properties.filter(p => p.type === 'property' && owned[p.id] === currentId && !mortgages[p.id] && (houses[p.id] ?? 0) < 5 && properties.filter(q => q.type === 'property' && q.group === p.group).every(q => owned[q.id] === currentId)) : [];
  const ownedMortgageable = currentId ? properties.filter(p => owned[p.id] === currentId && !mortgages[p.id] && p.type !== 'corner' && p.type !== 'tax' && p.type !== 'chance' && p.type !== 'chest' && !(p.type === 'property' && properties.some(q => q.type === 'property' && q.group === p.group && (houses[q.id] ?? 0) > 0))) : [];
  const ownedMortgaged = currentId ? properties.filter(p => owned[p.id] === currentId && mortgages[p.id]) : [];
  const pendingTrade = state.pendingTrade as {from?:string;to?:string;offeredProperties?:string[];requestedProperties?:string[];offeredCash?:number;requestedCash?:number} | null;
  const pendingPurchaseOffer = state.pendingPurchaseOffer as {from:string;to:string;propertyId:string;amount:number;attempt:number}|null;
  const landedOfferProperty = properties.find(p => p.id === state.offerPropertyId);
  const purchaseOfferInterest = landedOfferProperty && mortgages[landedOfferProperty.id] ? Math.ceil(Math.floor(landedOfferProperty.price / 2) * 0.1) : 0;
  const purchaseOfferCap = Math.max(0, meMoney - purchaseOfferInterest);
  const myTradeProps = currentId ? properties.filter(p => p.type==='property' || p.type==='railroad' || p.type==='utility').filter(p => owned[p.id]===currentId && !(p.type==='property' && properties.some(q=>q.type==='property'&&q.group===p.group&&(houses[q.id]??0)>0))) : [];
  const targetTradeId = tradeTo;
  const targetTradeProps = targetTradeId ? properties.filter(p => (p.type==='property'||p.type==='railroad'||p.type==='utility') && owned[p.id]===targetTradeId && !(p.type==='property' && properties.some(q=>q.type==='property'&&q.group===p.group&&(houses[q.id]??0)>0))) : [];
  const detailProperty = selectedSpace === null ? undefined : properties[selectedSpace];
  const detailOwnerId = detailProperty ? owned[detailProperty.id] : null;
  const detailOwner = session.players.find(p => p.id === detailOwnerId)?.name ?? (detailOwnerId ? 'Unknown player' : 'Unowned');
  const detailBuildings = detailProperty ? houses[detailProperty.id] ?? 0 : 0;
  const detailGroupComplete = !!detailProperty && detailProperty.type === 'property' && !!detailOwnerId && properties.filter(q=>q.type==='property'&&q.group===detailProperty.group).every(q=>owned[q.id]===detailOwnerId);
  const detailRent = !detailProperty || !detailOwnerId ? '—' : mortgages[detailProperty.id] ? '$0 (mortgaged)' : detailProperty.type === 'utility' ? `${properties.filter(q=>q.type==='utility'&&owned[q.id]===detailOwnerId).length >= 2 ? '10×' : '4×'} dice total` : detailProperty.type === 'railroad' ? `$${25 * Math.pow(2, Math.max(0, properties.filter(q=>q.type==='railroad'&&owned[q.id]===detailOwnerId).length-1))}` : detailBuildings > 0 ? `$${detailProperty.rent * ([1,5,15,45,80][Math.min(detailBuildings,5)] ?? 80)}` : `$${detailProperty.rent * (detailGroupComplete ? 2 : 1)}`;
  useEffect(() => { const open = () => setActionsOpen(true); window.addEventListener('hye:open-monopoly-actions', open); return () => window.removeEventListener('hye:open-monopoly-actions', open); }, []);
  useEffect(() => { if (!actionsOpen && !historyOpen && selectedSpace === null) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setActionsOpen(false); setHistoryOpen(false); setSelectedSpace(null); } }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [actionsOpen, historyOpen, selectedSpace]);
  useEffect(() => { if (phase === 'buy' || phase === 'offer' || phase === 'auction' || phase === 'bankruptcy-auction' || pendingTrade?.to === currentId || pendingPurchaseOffer?.to === currentId) setActionsOpen(true); }, [phase, pendingTrade?.to, pendingPurchaseOffer?.to, currentId]);
  useEffect(() => { if (!pendingPurchaseOffer) return; const target = session.players.find(p => p.id === pendingPurchaseOffer.to); if (target?.kind !== 'bot') return; const property = properties.find(p => p.id === pendingPurchaseOffer.propertyId); const accept = !!property && pendingPurchaseOffer.amount >= Math.ceil(property.price * 0.85); const timer = window.setTimeout(() => monopolyMove(accept ? 'accept_purchase' : 'reject_purchase'), 500); return () => window.clearTimeout(timer); }, [pendingPurchaseOffer?.attempt, pendingPurchaseOffer?.to, session.players, properties]);

  return <Cabinet accent={accent}>
    <Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset} />
    <Bezel accent={accent} aspectRatio={kind === 'monopoly' ? '1 / 1' : kind === 'chess' || kind === 'pirate-go' ? '1 / 1' : 'auto'} bleed={kind !== 'monopoly' && kind !== 'chess' && kind !== 'pirate-go'}>
      <Stage accent={accent}>
        {kind === 'monopoly'
          ? <MonopolyVisual properties={properties} owned={owned} positions={positions} houses={houses} colors={colors} city={city} players={session.players} lastRoll={Array.isArray(state.lastRoll) ? state.lastRoll as [number, number] : null} onSelectSpace={setSelectedSpace} />
          : coreKind ? <InteractiveCoreGame kind={kind} state={state} currentId={currentId} canAct={canAct} onMove={onMove} colors={colors} />
          : <GenericVisual kind={kind} colors={colors} progress={progress} players={session.players} />}
      </Stage>
    </Bezel>
    {kind === 'monopoly' && <section className="hye-game-overview" aria-label="Monopoly scoreboard">
      <div className="hye-scoreboard">
        <div className="hye-panel-heading"><span>Player Finances</span><span className="hye-stat-pill">{properties.filter(property=>owned[property.id]).length} properties owned</span></div>
        <div className="hye-score-grid">{session.players.map((player,index)=>{
          const ownedProperties=properties.filter(property=>owned[property.id]===player.id);
          const buildingCount=ownedProperties.reduce((sum,property)=>sum+(houses[property.id]??0),0);
          const active=player.id===currentId;
          return <article key={player.id} className={`hye-score-card ${active?'is-active':''}`}>
            <div className="hye-score-card-top"><span className="hye-score-seat">{index+1}</span><strong>{player.name}</strong>{active&&<span className="hye-stat-pill active">TURN</span>}</div>
            <div className="hye-score-metrics"><span>${money[player.id]??0} cash</span><span>{ownedProperties.length} properties</span><span>{buildingCount} buildings</span></div>
            <div className="hye-event-note">{ownedProperties.length ? ownedProperties.map(property=>property.name).join(' · ') : 'No properties owned yet'}</div>
          </article>;
        })}</div>
      </div>
    </section>}
    {kind !== 'monopoly' && generalScores && <section className="hye-game-overview" aria-label={`${game.name} scoreboard`}>
      <div className="hye-scoreboard"><div className="hye-panel-heading"><span>Match Scoreboard</span>{typeof state.round === 'number' && <span className="hye-stat-pill">Round {state.round}</span>}</div>
        <div className="hye-score-grid">{generalPlayerIds.map((id,index)=>{const active=id===currentId;return <article key={id} className={`hye-score-card ${active?'is-active':''}`}><div className="hye-score-card-top"><span className="hye-score-seat">{index+1}</span><strong>{session.players.find(player=>player.id===id)?.name ?? id}</strong>{active&&session.status==='playing'&&<span className="hye-stat-pill active">TURN</span>}</div><div className="hye-score-metrics"><span>{Number(generalScores[id]??0)} points</span></div></article>;})}</div>
      </div>
    </section>}
    <ControlDeck accent={accent}>
      <PlayerPips players={session.players} currentId={currentId} onPlayerSelect={onOpenPlayerProfile} />
      <TurnBadge players={session.players} currentId={currentId} status={session.status} result={session.result} isMyTurn={isMyTurn} />
      {kind === 'monopoly' && session.status === 'playing' ? (
        <>
        <div className="hye-monopoly-main-controls" style={styles.monopolyMainControls}>
          <button type="button" onClick={() => { setActionsOpen(false); monopolyMove('roll'); }} disabled={!canAct || phase !== 'roll'} style={{...styles.monopolyRollButton, opacity: canAct && phase === 'roll' ? 1 : .48}} aria-label="Roll two dice">🎲 Roll Dice</button>
          <button type="button" onClick={() => setActionsOpen(true)} style={styles.monopolyMoreButton}>More Actions</button>
        </div>
        <div className={`hye-monopoly-actions ${actionsOpen ? 'is-open' : ''}`} role="presentation" onClick={event => { if (event.target === event.currentTarget) setActionsOpen(false); }} style={styles.monopolyActions}>
          <section role="dialog" aria-modal="true" aria-label="Monopoly action popup" onClick={event => event.stopPropagation()} style={styles.monopolyActionPanel}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',width:'100%'}}>
            <strong style={{color:tokens.text.primary,fontSize:18}}>{phase === 'buy' ? 'Property decision' : phase === 'auction' || phase === 'bankruptcy-auction' ? 'Auction actions' : pendingTrade?.to === currentId ? 'Trade offer' : pendingPurchaseOffer?.to === currentId ? 'Purchase offer' : 'Monopoly actions'}</strong>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button onClick={()=>{setActionsOpen(false);setHistoryOpen(true);}} style={styles.secondaryAction}>History ({log.length})</button><button aria-label="Close Monopoly actions" onClick={()=>setActionsOpen(false)} style={{...styles.secondaryAction,minWidth:38,minHeight:38,borderRadius:999,fontSize:20,fontWeight:900,lineHeight:1,padding:0}}>×</button></div>
          </div>
          <div style={styles.monopolyMoney}>Cash: <strong>${meMoney}</strong>{phase === 'buy' && landedProperty ? <> • Landed: <strong>{landedProperty.name}</strong></> : null}{(phase === 'auction' || phase === 'bankruptcy-auction') ? <> • Auction: <strong>${auction?.highBid ?? 0}</strong>{phase === 'bankruptcy-auction' ? ' • Bank liquidation' : ''}</> : null}</div>
          {phase === 'roll' && <>{ownedBuilds.map(prop => <button key={prop.id} onClick={() => monopolyMove('build', undefined, prop.id)} disabled={!canAct} style={{ ...styles.secondaryAction, opacity: canAct ? 1 : .45 }}>Build {prop.name}</button>)}{ownedMortgageable.map(prop => <button key={`m-${prop.id}`} onClick={() => monopolyMove('mortgage', undefined, prop.id)} disabled={!canAct} style={{ ...styles.secondaryAction, opacity: canAct ? 1 : .45 }}>Mortgage {prop.name} ${Math.floor(prop.price/2)}</button>)}{ownedMortgaged.map(prop => <button key={`u-${prop.id}`} onClick={() => monopolyMove('unmortgage', undefined, prop.id)} disabled={!canAct || meMoney < Math.floor(prop.price*.55)} style={{ ...styles.secondaryAction, opacity: canAct && meMoney >= Math.floor(prop.price*.55) ? 1 : .45 }}>Lift {prop.name} ${Math.floor(prop.price*.55)}</button>)}</>}
          {phase === 'buy' && <div style={styles.propertyDecisionGrid}><div style={styles.propertyDecisionSummary}><span style={styles.detailLabel}>Landed property</span><strong>{landedProperty?.name ?? 'Property'}</strong><span>Price: <b>${landedProperty?.price ?? 0}</b> · Your cash: <b>${meMoney}</b></span></div><button onClick={() => { monopolyMove('buy'); setActionsOpen(false); }} disabled={!canAct || !landedProperty || meMoney < landedProperty.price} style={{ ...styles.action, opacity: canAct && !!landedProperty && meMoney >= landedProperty.price ? 1 : .45 }}>Buy property</button><button onClick={() => monopolyMove('auction')} disabled={!canAct} style={{ ...styles.secondaryAction, opacity: canAct ? 1 : .45 }}>Auction property</button><button onClick={() => { monopolyMove('decline'); setActionsOpen(false); }} disabled={!canAct} style={{ ...styles.secondaryAction, opacity: canAct ? 1 : .45 }}>Decline (no auction)</button></div>}
          {phase === 'offer' && landedOfferProperty && <div style={{display:'flex',flexDirection:'column',gap:9,width:'100%',padding:12,borderRadius:14,background:'rgba(255,255,255,.045)',border:'1px solid rgba(255,255,255,.1)'}}><strong>Interested in {landedOfferProperty.name}?</strong><span style={{fontSize:12,color:tokens.text.secondary}}>Owned by {session.players.find(p=>p.id===owned[landedOfferProperty.id])?.name ?? 'another player'}. You already paid any rent due{purchaseOfferInterest ? `; ${purchaseOfferInterest} mortgage interest will also be charged` : ''}. Make up to {Math.max(0,5-(Number(state.offerCount)||0))} offer{5-(Number(state.offerCount)||0)===1?'':'s'} before ending your turn.</span>{!pendingPurchaseOffer && Number(state.offerCount??0)<5 && <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:7}}><input type='number' min={1} max={purchaseOfferCap} value={purchaseAmount} onChange={e=>setPurchaseAmount(Math.max(0,Math.min(purchaseOfferCap,Math.floor(Number(e.target.value)||0))))} placeholder='Offer amount' style={styles.tradeInput}/><button onClick={()=>setPurchaseAmount(purchaseOfferCap)} style={styles.secondaryAction}>All cash</button><button onClick={()=>monopolyMove('offer_purchase',purchaseAmount,landedOfferProperty.id)} disabled={!canAct||purchaseAmount<=0||purchaseAmount>purchaseOfferCap} style={styles.action}>Send offer</button></div>}{pendingPurchaseOffer && <p style={{fontSize:12,color:tokens.text.secondary,margin:0}}>Waiting for {session.players.find(p=>p.id===pendingPurchaseOffer.to)?.name ?? 'the owner'} to respond to offer {pendingPurchaseOffer.attempt}/5.</p>}<button onClick={()=>monopolyMove('end_offer')} disabled={!canAct||!!pendingPurchaseOffer} style={styles.secondaryAction}>End turn</button></div>}
          {pendingPurchaseOffer && <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',flexWrap:'wrap',width:'100%',padding:12,borderRadius:14,background:'rgba(232,185,92,.08)',border:'1px solid rgba(232,185,92,.2)'}}><strong>{session.players.find(p=>p.id===pendingPurchaseOffer.from)?.name ?? 'A player'} offers ${pendingPurchaseOffer.amount} for {properties.find(p=>p.id===pendingPurchaseOffer.propertyId)?.name}</strong>{(!props.lanClient || props.lanClient.clientId===pendingPurchaseOffer.to) && <><button onClick={()=>monopolyMove('accept_purchase')} style={styles.action}>Accept</button><button onClick={()=>monopolyMove('reject_purchase')} style={styles.secondaryAction}>Reject</button></>}</div>}
          {(phase === 'auction' || phase === 'bankruptcy-auction') && <><button onClick={() => monopolyMove('bid', (auction?.highBid ?? 0) + 10)} disabled={!canAct || meMoney < (auction?.highBid ?? 0) + 10} style={{ ...styles.action, opacity: canAct && meMoney >= (auction?.highBid ?? 0) + 10 ? 1 : .45 }}>Bid ${(auction?.highBid ?? 0) + 10}</button><button onClick={() => monopolyMove('pass')} disabled={!canAct} style={{ ...styles.secondaryAction, opacity: canAct ? 1 : .45 }}>Pass Auction</button></>}
          {phase === 'roll' && session.players.length > 1 && <div className="hye-action-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:6,width:'100%'}}>
            <select value={tradeTo} onChange={e=>{setTradeTo(e.target.value);setRequestProperty('');}} disabled={!canAct} style={styles.secondaryAction}><option value=''>Trade with…</option>{session.players.filter(p=>p.id!==currentId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={offerProperty} onChange={e=>setOfferProperty(e.target.value)} disabled={!canAct || !targetTradeId} style={styles.secondaryAction}><option value=''>Offer property…</option>{myTradeProps.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={requestProperty} onChange={e=>setRequestProperty(e.target.value)} disabled={!canAct || !targetTradeId} style={styles.secondaryAction}><option value=''>Request property…</option>{targetTradeProps.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type='number' min={0} max={meMoney} value={offerCash} onChange={e=>setOfferCash(Math.max(0,Number(e.target.value)||0))} disabled={!canAct} placeholder='Cash offered' style={styles.tradeInput}/>
            <input type='number' min={0} value={requestCash} onChange={e=>setRequestCash(Math.max(0,Number(e.target.value)||0))} disabled={!canAct} placeholder='Cash requested' style={styles.tradeInput}/>
            <button onClick={()=>{monopolyMove('offer_trade',undefined,undefined,{to:targetTradeId,offeredProperties:offerProperty?[offerProperty]:[],requestedProperties:requestProperty?[requestProperty]:[],offerCash,requestCash});setOfferProperty('');setRequestProperty('');}} disabled={!canAct||!targetTradeId||(!offerProperty&&!requestProperty&&!offerCash&&!requestCash)} style={{...styles.secondaryAction,opacity:canAct&&targetTradeId?1:.45}}>Offer Trade</button>
          </div>}
          {pendingTrade && pendingTrade.to===currentId && <div style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center',flexWrap:'wrap',width:'100%'}}>
            <strong>Trade offer from {session.players.find(p=>p.id===pendingTrade.from)?.name ?? pendingTrade.from}</strong>
            <span>Gives ${pendingTrade.offeredCash??0} + {(pendingTrade.offeredProperties??[]).map(id=>properties.find(p=>p.id===id)?.name??id).join(', ')||'nothing'}</span>
            <span>for ${pendingTrade.requestedCash??0} + {(pendingTrade.requestedProperties??[]).map(id=>properties.find(p=>p.id===id)?.name??id).join(', ')||'nothing'}</span>
            <button onClick={()=>monopolyMove('accept_trade')} style={styles.action}>Accept</button><button onClick={()=>monopolyMove('reject_trade')} style={styles.secondaryAction}>Reject</button>
          </div>}
          </section>
        </div>
        </>
      ) : coreKind ? <span style={styles.coreHint}>{session.status === 'finished' ? 'Game finished — use Reset to play again.' : isMyTurn ? 'Your move' : 'Waiting for the other player…'}</span> : <button onClick={sendAction} disabled={!canAct && session.status === 'playing'} style={{ ...styles.action, opacity: canAct || session.status === 'finished' ? 1 : .45 }}>{session.status === 'finished' ? 'Play Again' : action}</button>}
    </ControlDeck>
        {log.length > 0 && <section className="hye-game-event-feed" aria-label="Recent game events" style={styles.log}><div className="hye-game-event-title" style={styles.eventTitle}>Recent Events</div>{log.slice(-3).reverse().map((x, i) => <div className="hye-game-event-item" key={`${x}-${i}`} style={styles.eventItem}><span style={styles.eventIndex}>{log.length-i}</span><span>{humanize(x, session.players)}</span></div>)}</section>}
    {historyOpen && <div className="hye-activity-overlay" role="presentation" onClick={()=>setHistoryOpen(false)} style={styles.overlay}>
      <section className="hye-activity-panel" role="dialog" aria-modal="true" aria-label="Game activity history" onClick={e=>e.stopPropagation()} style={styles.modalPanel}>
        <header style={styles.modalHeader}><div><strong style={{fontSize:18}}>Game activity</strong><div style={{fontSize:12,color:tokens.text.muted}}>Full match log · newest first</div></div><button onClick={()=>setHistoryOpen(false)} aria-label="Close history" style={styles.closeButton}>Close</button></header>
        <div style={styles.historyList}>{log.length ? [...log].reverse().map((entry,i)=><article key={`${i}-${entry}`} style={styles.historyItem}><span style={styles.historyIndex}>{log.length-i}</span><span>{humanize(entry,session.players)}</span></article>) : <p>No activity yet. Roll the dice to start the match.</p>}</div>
      </section>
    </div>}
    {selectedSpace !== null && <div className="hye-activity-overlay" role="presentation" onClick={()=>setSelectedSpace(null)} style={styles.overlay}>
      <section className="hye-activity-panel" role="dialog" aria-modal="true" aria-label="Board space details" onClick={e=>e.stopPropagation()} style={styles.modalPanel}>
        <header style={styles.modalHeader}><div><strong style={{fontSize:18}}>{detailProperty?.name ?? ['START','JAIL / VISIT','FREE PARKING','GO TO JAIL'][selectedSpace===0?0:selectedSpace===10?1:selectedSpace===20?2:3]}</strong><div style={{fontSize:12,color:tokens.text.muted}}>Board space {selectedSpace + 1} of {properties.length}</div></div><button onClick={()=>setSelectedSpace(null)} style={styles.closeButton}>Close</button></header>
        {detailProperty ? <div style={styles.propertyDetails}>
          <div style={styles.detailCell}><span style={styles.detailLabel}>Owner</span><strong>{detailOwner}</strong></div><div style={styles.detailCell}><span style={styles.detailLabel}>Purchase price</span><strong>{detailProperty.price ? `$${detailProperty.price}` : 'Not purchasable'}</strong></div><div style={styles.detailCell}><span style={styles.detailLabel}>Current rent</span><strong>{detailRent}</strong></div><div style={styles.detailCell}><span style={styles.detailLabel}>Colour / group</span><strong>{detailProperty.group}</strong></div><div style={styles.detailCell}><span style={styles.detailLabel}>Buildings</span><strong>{houses[detailProperty.id] >= 5 ? 'Hotel' : `${houses[detailProperty.id] ?? 0} houses`}</strong></div><div style={styles.detailCell}><span style={styles.detailLabel}>Mortgage</span><strong>{mortgages[detailProperty.id] ? 'Mortgaged' : 'Clear'}</strong></div>
          {detailProperty.type==='property' && detailOwnerId && properties.filter(q=>q.type==='property'&&q.group===detailProperty.group).every(q=>owned[q.id]===detailOwnerId) && <p style={{color:tokens.accent.gold,fontWeight:800}}>Complete colour set: base rent is doubled before building rent applies.</p>}
          {detailOwnerId===currentId && canAct && phase==='roll' && <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={()=>{monopolyMove('mortgage',undefined,detailProperty.id);setSelectedSpace(null)}} disabled={!!mortgages[detailProperty.id]||!['property','railroad','utility'].includes(detailProperty.type)||(detailProperty.type==='property'&&properties.some(q=>q.type==='property'&&q.group===detailProperty.group&&(houses[q.id]??0)>0))} style={styles.secondaryAction}>Mortgage</button><button onClick={()=>{monopolyMove('unmortgage',undefined,detailProperty.id);setSelectedSpace(null)}} disabled={!mortgages[detailProperty.id]||meMoney<Math.ceil(Math.floor(detailProperty.price/2)*1.1)} style={styles.action}>Unmortgage</button></div>}
          {detailOwnerId && detailOwnerId!==currentId && canAct && phase==='roll' && <button style={styles.action} onClick={()=>{setTradeTo(detailOwnerId);setRequestProperty(detailProperty.id);setActionsOpen(true);setSelectedSpace(null)}}>Propose a trade for this property</button>}
        </div> : <p style={{padding:16,color:tokens.text.secondary}}>Special board space. Landing effects are handled automatically by the game engine.</p>}
      </section>
    </div>}
  </Cabinet>;
}


function InteractiveCoreGame({kind,state,currentId,canAct,onMove,colors}:{kind:string;state:Record<string,unknown>;currentId:string|null;canAct:boolean;onMove:(m:any)=>void;colors:string[]}){
  if(kind==='chess')return <ChessBoardInteractive state={state} canAct={canAct} currentId={currentId} onMove={onMove} colors={colors}/>;
  if(kind==='pirate-go')return <GoBoardInteractive state={state} canAct={canAct} onMove={onMove}/>;
  if(kind==='scrabble')return <ScrabbleBoardInteractive state={state} canAct={canAct} onMove={onMove} colors={colors}/>;
  return <MahjongBoardInteractive state={state} canAct={canAct} onMove={onMove} colors={colors}/>;
}

const chessGlyph:Record<string,string>={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
function ChessBoardInteractive({state,canAct,currentId,onMove,colors}:{state:any;canAct:boolean;currentId:string|null;onMove:(m:any)=>void;colors:string[]}){
  const [selected,setSelected]=useState<number|null>(null); const [pending,setPending]=useState<number|null>(null);
  const board=state.board as any[];
  const send=(to:number,promotion?:'q'|'r'|'b'|'n')=>{if(selected===null)return;onMove({type:'move',player:currentId,payload:{action:'move',from:selected,to,...(promotion?{promotion}:{})},ts:Date.now()});setSelected(null);setPending(null);};
  const click=(i:number)=>{if(!canAct)return;const piece=board[i];if(selected===null){if(piece?.c===(state.turn===0?'w':'b'))setSelected(i);return;}if(i===selected){setSelected(null);return;}const mover=board[selected];if(mover?.t==='p'&&(Math.floor(i/8)===0||Math.floor(i/8)===7)){setPending(i);return;}send(i);};
  const sq=72, pad=38, size=8*sq;
  return <div style={styles.coreBoardWrap}>
    <svg viewBox={`0 0 ${size+pad*2} ${size+pad*2}`} style={{width:'min(98vw, calc(100dvh - 190px), 760px)',aspectRatio:'1/1',display:'block',filter:'drop-shadow(0 18px 30px rgba(0,0,0,.35))'}} role="img" aria-label="Interactive 8 by 8 chessboard">
      <defs><linearGradient id="chessWood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7b4f2d"/><stop offset=".5" stopColor="#b47a45"/><stop offset="1" stopColor="#5a361f"/></linearGradient><filter id="chessPiece"><feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity=".45"/></filter></defs>
      <rect x="5" y="5" width={size+pad*2-10} height={size+pad*2-10} rx="18" fill="url(#chessWood)" stroke="#e4c18d" strokeWidth="5"/>
      <rect x={pad-3} y={pad-3} width={size+6} height={size+6} rx="4" fill="#33251b"/>
      {board.map((piece,i)=>{const row=Math.floor(i/8),col=i%8,x=pad+col*sq,y=pad+row*sq,light=(row+col)%2===0,sel=selected===i;return <g key={i} onClick={()=>click(i)} style={{cursor:canAct?'pointer':'default'}}>
        <rect x={x} y={y} width={sq} height={sq} fill={light?'#ead7b5':'#8a5c39'}/>
        {sel&&<rect x={x+3} y={y+3} width={sq-6} height={sq-6} fill="none" stroke={colors[1]} strokeWidth="6"/>}
        {piece&&<text x={x+sq/2} y={y+sq*.72} textAnchor="middle" fontSize="51" fontFamily="Georgia,serif" fill={piece.c==='w'?'#fffaf0':'#18120e'} stroke={piece.c==='w'?'#4a3827':'#f3dfb8'} strokeWidth="1.5" filter="url(#chessPiece)">{chessGlyph[piece.c+piece.t]}</text>}
      </g>})}
      {['a','b','c','d','e','f','g','h'].map((l,i)=><text key={'f'+l} x={pad+i*sq+sq-7} y={pad+size+25} fontSize="15" fontWeight="900" fill="#f4dfb8">{l}</text>)}
      {Array.from({length:8},(_,i)=><text key={'r'+i} x="18" y={pad+i*sq+18} fontSize="15" fontWeight="900" fill="#f4dfb8">{8-i}</text>)}
    </svg>
    {pending!==null&&<div style={styles.scrabbleControls}><span style={styles.coreHint}>Promote pawn:</span>{(['q','r','b','n'] as const).map(x=><button key={x} onClick={()=>send(pending,x)} style={styles.secondaryAction}>{x.toUpperCase()}</button>)}</div>}
  </div>;
}
function GoBoardInteractive({state,canAct,onMove}:{state:any;canAct:boolean;onMove:(m:any)=>void}){
  const size=state.size as number,board=state.board as number[],ids=state.playerIds as string[];
  const captures=state.captures??{};const scoreA=captures[ids[0]]??0,scoreB=captures[ids[1]]??0;
  const goMode=state.mode==='go',scoring=state.phase==='scoring',finished=state.phase==='finished'||state.finished;
  const dead=new Set<number>(state.deadStones??[]);
  const send=(payload:any,type=payload.action)=>onMove({type,player:ids[state.turn],payload,ts:Date.now()});
  const margin=48,span=504,step=span/(size-1),coord=(index:number)=>margin+index*step;
  const starPoints=size===9?[2*size+2,2*size+6,4*size+4,6*size+2,6*size+6]:[];
  const canTap=(value:number)=>canAct&&!finished&&(scoring?value!==0:value===0);
  return <div style={{...styles.coreBoardWrap,background:'linear-gradient(145deg,#ead39a,#c49a4d)',padding:10,border:'1px solid rgba(255,255,255,.24)',boxShadow:'0 18px 42px rgba(0,0,0,.35)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',color:'#2b2115',fontWeight:900,marginBottom:8}}><span>● {ids[0]} · {scoreA} captures</span><span>○ {ids[1]} · {scoreB} captures</span></div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:8,color:'#2b2115'}}><strong>{goMode?'TRADITIONAL GO':'CLASSIC PIRATE'}</strong><span style={{fontSize:11,fontWeight:800,letterSpacing:.5}}>{scoring?'AGREE ON DEAD GROUPS':finished?'GAME COMPLETE':`${size} × ${size} INTERSECTIONS`}</span></div>
    {scoring&&<div role="status" style={{padding:9,marginBottom:8,borderRadius:8,background:'rgba(255,250,235,.75)',color:'#2b2115',fontSize:12,lineHeight:1.45}}>Tap a stone group to mark or unmark it as dead. Both players must confirm the same board before scoring.</div>}
    {finished&&<div role="status" style={{textAlign:'center',fontWeight:900,padding:8,color:'#2b2115'}}>{state.winner?`${state.winner} wins`:'Draw'} · {goMode?`area score ${state.scores?.[ids[0]]??0}–${state.scores?.[ids[1]]??0}`:`capture score ${scoreA}–${scoreB}`}</div>}
    <svg viewBox="0 0 600 600" role="group" aria-label={`${goMode?'Traditional Go':'Classic Pirate'} board`} style={{display:'block',width:'min(96vw, calc(100dvh - 280px), 680px)',maxWidth:'100%',height:'auto',aspectRatio:'1 / 1',borderRadius:12,boxShadow:'inset 0 0 0 1px rgba(66,43,20,.35)',touchAction:'manipulation'}}>
      <defs>
        <radialGradient id="go-black-stone" cx="32%" cy="25%" r="78%"><stop offset="0%" stopColor="#50545a"/><stop offset="38%" stopColor="#202329"/><stop offset="100%" stopColor="#08090c"/></radialGradient>
        <radialGradient id="go-white-stone" cx="28%" cy="22%" r="82%"><stop offset="0%" stopColor="#ffffff"/><stop offset="65%" stopColor="#f1eee5"/><stop offset="100%" stopColor="#c9c4b8"/></radialGradient>
        <filter id="go-stone-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.5" dy="3" stdDeviation="2.2" floodColor="#2b2115" floodOpacity=".42"/></filter>
      </defs>
      <rect x="8" y="8" width="584" height="584" rx="12" fill="#d9b76c" stroke="#8a6331" strokeWidth="3"/>
      {Array.from({length:size},(_,i)=><g key={`line-${i}`}><line x1={coord(i)} y1={margin} x2={coord(i)} y2={margin+span} stroke="#4b351f" strokeWidth="1.7"/><line x1={margin} y1={coord(i)} x2={margin+span} y2={coord(i)} stroke="#4b351f" strokeWidth="1.7"/></g>)}
      {starPoints.map(index=><circle key={`star-${index}`} cx={coord(index%size)} cy={coord(Math.floor(index/size))} r="4.5" fill="#4b351f"/>)}
      {board.map((value:number,index:number)=>{const row=Math.floor(index/size),col=index%size,x=coord(col),y=coord(row),tappable=canTap(value);return <g key={index} role="button" aria-label={`Intersection ${row+1}, ${col+1}${value===1?', black stone':value===2?', white stone':''}${dead.has(index)?', marked dead':''}`} aria-disabled={!tappable} tabIndex={tappable?0:-1} onClick={()=>{if(!tappable)return;if(scoring&&value!==0)send({action:'toggle-dead',index},'toggle-dead');else if(!scoring&&value===0)send({action:'place',index},'place');}} onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&tappable){event.preventDefault();if(scoring&&value!==0)send({action:'toggle-dead',index},'toggle-dead');else if(!scoring&&value===0)send({action:'place',index},'place');}}} style={{cursor:tappable?'pointer':'default',outline:'none'}}>
        <circle cx={x} cy={y} r={step*.47} fill="transparent"/>
        {value!==0&&<circle cx={x} cy={y} r={step*.34} fill={value===1?'url(#go-black-stone)':'url(#go-white-stone)'} stroke={value===1?'#08090c':'#b8b3a8'} strokeWidth="1.2" filter="url(#go-stone-shadow)"/>}
        {dead.has(index)&&<><circle cx={x} cy={y} r={step*.43} fill="none" stroke="#b4232f" strokeWidth="4"/><path d={`M ${x-step*.22} ${y-step*.22} L ${x+step*.22} ${y+step*.22} M ${x+step*.22} ${y-step*.22} L ${x-step*.22} ${y+step*.22}`} stroke="#b4232f" strokeWidth="3.5" strokeLinecap="round"/></>}
        {tappable&&value===0&&!scoring&&<circle cx={x} cy={y} r={step*.12} fill="#fff8e8" opacity=".16"/>}
      </g>})}
    </svg>
    {scoring?<button disabled={!canAct||(state.scoreConfirmed??[]).includes(ids[state.turn])} onClick={()=>send({action:'confirm-score'},'confirm-score')} style={{...styles.action,marginTop:8,opacity:(state.scoreConfirmed??[]).includes(ids[state.turn])?.55:1}}>{(state.scoreConfirmed??[]).includes(ids[state.turn])?'Score confirmed':'Confirm agreed score'}</button>:<button disabled={!canAct||finished} onClick={()=>send({action:'pass'},'pass')} style={{...styles.secondaryAction,marginTop:8}}>Pass turn</button>}
    <p style={{color:'#2b2115',fontSize:12,margin:'8px 0 0',lineHeight:1.45}}>{goMode?'Traditional Go: place stones on line intersections, protect liberties, capture groups and avoid repeated positions. Two passes begin dead-stone agreement and area scoring.':'Classic Pirate: a faster capture-focused game. Two consecutive passes finish the match; the higher capture count wins.'}</p>
  </div>;
}
function ScrabbleBoardInteractive({state,canAct,onMove,colors}:{state:any;canAct:boolean;onMove:(m:any)=>void;colors:string[]}){
  const [selected,setSelected]=useState<string[]>([]),[word,setWord]=useState(''),[row,setRow]=useState(7),[col,setCol]=useState(7),[horizontal,setHorizontal]=useState(true);
  const rack=(state.racks?.[state.playerIds[state.turn]]??[]) as any[]; const board=state.board as any[];
  const premium=(r:number,c:number)=>{const key=`${r},${c}`;const TW=new Set(['0,0','0,7','0,14','7,0','7,14','14,0','14,7','14,14']);const DW=new Set(['1,1','2,2','3,3','4,4','7,7','10,10','11,11','12,12','13,13','1,13','2,12','3,11','4,10','10,4','11,3','12,2','13,1']);const TL=new Set(['1,5','1,9','5,1','5,5','5,9','5,13','9,1','9,5','9,9','9,13','13,5','13,9']);const DL=new Set(['0,3','0,11','2,6','2,8','3,0','3,7','3,14','6,2','6,6','6,8','6,12','7,3','7,11','8,2','8,6','8,8','8,12','11,0','11,7','11,14','12,6','12,8','14,3','14,11']);return TW.has(key)?['TW','#c9575b','TRIPLE WORD']:DW.has(key)?['DW','#e9a1a7','DOUBLE WORD']:TL.has(key)?['TL','#5a91cf','TRIPLE LETTER']:DL.has(key)?['DL','#8fc3e7','DOUBLE LETTER']:r===7&&c===7?['★','#e7a4aa','CENTER']:['','#d8b77b',''];};
  const [scrabbleMessage,setScrabbleMessage]=useState('');
  const submit=()=>{
    if(!canAct||!selected.length||!word.trim()){setScrabbleMessage('Choose rack tiles and enter the complete word.');return;}
    const target=word.trim().toLowerCase(),available=new Map(rack.filter(t=>selected.includes(t.id)).map(t=>[t.id,t]));
    const tiles:{tileId:string;row:number;col:number}[]=[];
    for(let i=0;i<target.length;i++){
      const r=row+(horizontal?0:i),c=col+(horizontal?i:0);
      if(r<0||r>14||c<0||c>14){setScrabbleMessage('That word would extend beyond the board.');return;}
      const existing=board[r*15+c];
      if(existing){if(existing.letter.toLowerCase()!==target[i]){setScrabbleMessage(`Board already has ${existing.letter.toUpperCase()} at that position.`);return;}continue;}
      const tile=[...available.values()].find(t=>!t.blank&&t.letter.toLowerCase()===target[i])??[...available.values()].find(t=>t.blank);
      if(!tile){setScrabbleMessage(`Select a tile for “${target[i].toUpperCase()}” (or a blank).`);return;}
      available.delete(tile.id);tiles.push({tileId:tile.id,row:r,col:c});
    }
    if(available.size){setScrabbleMessage('Some selected tiles are not used in this word.');return;}
    if(!tiles.length){setScrabbleMessage('The word must place at least one new tile.');return;}
    onMove({type:'play',player:state.playerIds[state.turn],payload:{action:'play',tiles,word:target},ts:Date.now()});
    setSelected([]);setWord('');setScrabbleMessage('');
  };
  const exchange=()=>{if(!canAct||!selected.length)return;onMove({type:'exchange',player:state.playerIds[state.turn],payload:{action:'exchange',tileIds:selected},ts:Date.now()});setSelected([]);};
  return <div style={styles.scrabbleWrap}>
    <div style={{display:'flex',alignItems:'center',gap:10,color:'#ead9b0',fontWeight:900}}><span>SCRABBLE</span><span style={{opacity:.6}}>15 × 15</span></div>
    <svg viewBox="0 0 720 720" style={{width:'min(98vw, calc(100dvh - 190px), 760px)',aspectRatio:'1/1',display:'block',filter:'drop-shadow(0 18px 28px rgba(0,0,0,.35))'}} role="img" aria-label="15 by 15 Scrabble board">
      <rect x="8" y="8" width="704" height="704" rx="18" fill="#704b2b" stroke="#c99b5c" strokeWidth="6"/>
      {Array.from({length:225},(_,i)=>{const r=Math.floor(i/15),c=i%15,x=30+c*44,y=30+r*44,[label,bg]=premium(r,c);const t=board[i];return <g key={i}><rect x={x} y={y} width="42" height="42" rx="4" fill={t?'#f0d69d':bg} stroke="#765335" strokeWidth="1.5"/>{label&& !t&&<text x={x+21} y={y+27} textAnchor="middle" fontSize={label==='★'?18:10} fontWeight="1000" fill="#fff8e8">{label}</text>}{t&&<><text x={x+21} y={y+28} textAnchor="middle" fontSize="23" fontWeight="1000" fontFamily="Georgia,serif" fill="#241b13">{t.letter?.toUpperCase()??''}</text><text x={x+34} y={y+38} textAnchor="middle" fontSize="9" fontWeight="900" fill="#5d4730">{t.value}</text></>}</g>})}
      {Array.from({length:15},(_,i)=><text key={'c'+i} x={51+i*44} y="20" textAnchor="middle" fontSize="10" fill="#f1dfbf">{String.fromCharCode(65+i)}</text>)}
    </svg>
    <div style={styles.rack}>{rack.map(t=><button key={t.id} onClick={()=>setSelected(x=>x.includes(t.id)?x.filter(y=>y!==t.id):[...x,t.id])} style={{...styles.rackTile,outline:selected.includes(t.id)?`3px solid ${colors[1]}`:'none'}}>{t.blank?'□':t.letter.toUpperCase()}<small>{t.value}</small></button>)}</div>
    <div style={styles.scrabbleControls}><input value={word} onChange={e=>{setWord(e.target.value);setScrabbleMessage('');}} placeholder="Complete word" style={styles.input}/><input type="number" min={0} max={14} value={row} onChange={e=>setRow(Number(e.target.value))} style={styles.coord}/><input type="number" min={0} max={14} value={col} onChange={e=>setCol(Number(e.target.value))} style={styles.coord}/><button onClick={()=>setHorizontal(x=>!x)} style={styles.secondaryAction}>{horizontal?'→':'↓'}</button><button onClick={submit} disabled={!canAct} style={styles.action}>Play</button><button onClick={exchange} disabled={!canAct||!selected.length||!(state.bag?.length)} style={styles.secondaryAction}>Exchange</button><button onClick={()=>canAct&&onMove({type:'pass',player:state.playerIds[state.turn],payload:{action:'pass'},ts:Date.now()})} style={styles.secondaryAction}>Pass</button></div>{scrabbleMessage&&<div role="status" style={{color:'#ffd59a',fontSize:13,textAlign:'center'}}>{scrabbleMessage}</div>}
  </div>;
}
function MahjongBoardInteractive({state,canAct,onMove,colors}:{state:any;canAct:boolean;onMove:(m:any)=>void;colors:string[]}){
  const p=state.playerIds[state.turn],hand=(state.hands?.[p]??[]) as any[],[selected,setSelected]=useState<string[]>([]);
  const claim=state.phase==='claim';
  const toggle=(id:string,max:number)=>setSelected(x=>x.includes(id)?x.filter(y=>y!==id):x.length<max?[...x,id]:x);
  return <div style={styles.mahjongInteractive}>
    <div style={styles.wallInfo}>Live wall: {state.wall?.length??0} • Dead wall: {state.deadWall?.length??0} {claim?'• CLAIM WINDOW':''}</div>
    {!!(state.flowers?.[p]?.length) && <div style={styles.coreHint}>Flowers/Seasons: {state.flowers[p].map((t:any)=>tileLabel(t.kind)).join(' ')}</div>}
    <div style={styles.mahjongHand}>{hand.map(t=><button key={t.id} onClick={()=>toggle(t.id,4)} style={{...styles.tileButton,outline:selected.includes(t.id)?`3px solid ${colors[1]}`:'none'}}>{tileLabel(t.kind)}</button>)}</div>
    <div style={styles.mahjongControls}>{claim?<>
      <button onClick={()=>canAct&&onMove({type:'pon',player:p,payload:{action:'pon',tileIds:selected},ts:Date.now()})} disabled={!canAct||selected.length!==2} style={styles.action}>Pon</button>
      <button onClick={()=>canAct&&onMove({type:'kong',player:p,payload:{action:'kong',tileIds:selected},ts:Date.now()})} disabled={!canAct||selected.length!==3} style={styles.action}>Kong</button>
      <button onClick={()=>canAct&&onMove({type:'chi',player:p,payload:{action:'chi',tileIds:selected},ts:Date.now()})} disabled={!canAct||selected.length!==2} style={styles.secondaryAction}>Chi</button>
      <button onClick={()=>canAct&&onMove({type:'win',player:p,payload:{action:'win'},ts:Date.now()})} disabled={!canAct} style={styles.secondaryAction}>Mahjong</button>
      <button onClick={()=>canAct&&onMove({type:'passClaim',player:p,payload:{action:'passClaim'},ts:Date.now()})} disabled={!canAct} style={styles.secondaryAction}>Pass Claim</button>
    </>:<>
      <button onClick={()=>canAct&&state.phase==='draw'&&onMove({type:'draw',player:p,payload:{action:'draw'},ts:Date.now()})} disabled={!canAct||state.phase!=='draw'} style={styles.action}>Draw</button>
      <button onClick={()=>canAct&&selected.length===1&&state.phase==='discard'&&onMove({type:'discard',player:p,payload:{action:'discard',tileId:selected[0]},ts:Date.now()})} disabled={!canAct||selected.length!==1||state.phase!=='discard'} style={styles.secondaryAction}>Discard</button>
      <button onClick={()=>canAct&&selected.length===4&&state.phase==='discard'&&onMove({type:'kong',player:p,payload:{action:'kong',tileIds:selected},ts:Date.now()})} disabled={!canAct||selected.length!==4||state.phase!=='discard'} style={styles.action}>Concealed Kong</button>
      <button onClick={()=>canAct&&state.phase==='discard'&&onMove({type:'win',player:p,payload:{action:'win'},ts:Date.now()})} disabled={!canAct||state.phase!=='discard'} style={styles.secondaryAction}>Mahjong</button>
    </>}</div></div>;
}
function tileLabel(k:string){if(k[0]==='m')return `萬${k.slice(1)}`;if(k[0]==='p')return `筒${k.slice(1)}`;if(k[0]==='s')return `索${k.slice(1)}`;return k[0]==='w'?['東','南','西','北'][Number(k.slice(1))-1]??k:['中','發','白'][Number(k.slice(1))-1]??k;}

function humanize(text: string, players: { id: string; name: string }[]) {
  let out = text;
  for (const p of players) out = out.replaceAll(p.id, p.name);
  return out;
}

function GenericVisual({ kind, colors, progress, players }: { kind: string; colors: string[]; progress: number; players: { id: string; name: string; seat: number }[] }) {
  const title = kind === 'monopoly-deal' ? 'PROPERTY DEAL' : kind === 'scramble' ? 'WORD SCRAMBLE' : kind === 'treasure-hunt' ? 'TREASURE MAP' : kind === 'scrabble' ? 'SCRABBLE' : kind === 'mahjong' ? 'MAHJONG TABLE' : kind === 'pirate-go' ? 'PIRATE GO' : kind.toUpperCase();
  if (kind === 'chess') return <ChessVisual colors={colors} />;
  if (kind === 'pirate-go') return <GoVisual colors={colors} />;
  if (kind === 'scrabble') return <ScrabbleVisual colors={colors} progress={progress} />;
  if (kind === 'mahjong') return <MahjongVisual colors={colors} players={players} />;
  if (kind === 'treasure-hunt') return <TreasureVisual colors={colors} progress={progress} />;
  return <div style={styles.visual}>
    <div style={{ ...styles.bigTitle, color: colors[0] }}>{title}</div>
    <div style={styles.progress}>{Array.from({ length: 10 }, (_, i) => <span key={i} style={{ ...styles.dot, background: i < Math.min(10, Math.ceil(progress / 3)) ? colors[i % colors.length] : tokens.bg.border }} />)}</div>
    <div style={styles.cards}>{colors.map((c, i) => <div key={c} style={{ ...styles.card, background: c, transform: `rotate(${(i - 1.5) * 2}deg)` }}>{kind === 'scramble' ? 'A' : kind === 'monopoly-deal' ? '$' : '✦'}</div>)}</div>
    <div style={styles.infoStrip}>{players.map((p, i) => <div key={p.id} style={styles.infoChip}><span style={{ ...styles.infoDot, background: colors[i % colors.length] }} />{p.name}</div>)}</div>
  </div>;
}

function ChessVisual({ colors }: { colors: string[] }) {
  return <svg viewBox="0 0 720 720" style={styles.svg} role="img" aria-label="Chess board">
    <defs><linearGradient id="chessBoard" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9bd8e" /><stop offset="1" stopColor="#8b6545" /></linearGradient></defs>
    <rect width="720" height="720" rx="24" fill="#17151b" />
    <rect x="32" y="32" width="656" height="656" rx="14" fill="url(#chessBoard)" stroke="#e8d9b0" strokeWidth="5" />
    {Array.from({ length: 64 }, (_, i) => <rect key={i} x={40 + (i % 8) * 80} y={40 + Math.floor(i / 8) * 80} width="80" height="80" fill={((i + Math.floor(i / 8)) % 2 === 0) ? '#f0dfbe' : '#79583d'} />)}
    <text x="360" y="370" textAnchor="middle" fontSize="94" fontFamily="serif" fill={colors[0]}>♔</text>
    <text x="360" y="460" textAnchor="middle" fontSize="72" fontFamily="serif" fill={colors[1]}>♚</text>
  </svg>;
}

function GoVisual({ colors }: { colors: string[] }) {
  return <svg viewBox="0 0 720 720" style={styles.svg} role="img" aria-label="Pirate Go board">
    <rect width="720" height="720" rx="24" fill="#163b52" />
    <rect x="48" y="48" width="624" height="624" rx="12" fill="#d7b86c" stroke="#c39b55" strokeWidth="8" />
    {Array.from({ length: 13 }, (_, i) => <g key={i}><line x1={72 + i * 48} y1="72" x2={72 + i * 48} y2="648" stroke="#5c462b" strokeWidth="2" /><line x1="72" y1={72 + i * 48} x2="648" y2={72 + i * 48} stroke="#5c462b" strokeWidth="2" /></g>)}
    {[3, 9].flatMap(x => [3, 9].map(y => <circle key={`${x}-${y}`} cx={72 + x * 48} cy={72 + y * 48} r="7" fill="#3e2d1d" />))}
    {[['#111', 5, 5], ['#fff', 8, 7], [colors[0], 4, 8], [colors[1], 9, 4]].map(([c, x, y], i) => <circle key={i} cx={72 + Number(x) * 48} cy={72 + Number(y) * 48} r="18" fill={String(c)} stroke="#1a1510" strokeWidth="3" />)}
    <text x="360" y="350" textAnchor="middle" fontSize="34" fontWeight="900" fill="#6e5128">PIRATE GO</text>
  </svg>;
}

function ScrabbleVisual({ colors, progress }: { colors: string[]; progress: number }) {
  const letters = 'HYEARCADE';
  return <svg viewBox="0 0 720 720" style={styles.svg} role="img" aria-label="Scrabble board">
    <rect width="720" height="720" rx="24" fill="#6f432e" />
    {Array.from({ length: 225 }, (_, i) => { const x = i % 15, y = Math.floor(i / 15); const special = (x === 7 && y === 7) ? '#d85b6a' : (x + y) % 7 === 0 ? '#7aa7b7' : '#e7c98c'; return <rect key={i} x={42 + x * 42} y={42 + y * 42} width="40" height="40" rx="3" fill={special} stroke="#9d744e" />; })}
    {Array.from({ length: Math.min(letters.length, Math.max(1, Math.ceil(progress / 3))) }, (_, i) => <g key={i}><rect x={175 + i * 43} y="342" width="40" height="40" rx="6" fill="#f0dfb0" stroke="#6b4a2e" strokeWidth="2" /><text x={195 + i * 43} y="371" textAnchor="middle" fontSize="22" fontWeight="900" fill={colors[i % colors.length]}>{letters[i]}</text></g>)}
  </svg>;
}

function MahjongVisual({ colors, players }: { colors: string[]; players: { id: string; name: string; seat: number }[] }) {
  return <div style={styles.mahjongWrap}>
    <div style={styles.mahjongTitle}>4-PLAYER MAHJONG</div>
    <div style={styles.mahjongTable}>
      {players.map((p, i) => <div key={p.id} style={{ ...styles.mahjongPlayer, ...(i === 0 ? styles.mahjongBottom : {}) }}><span style={{ ...styles.infoDot, background: colors[i % colors.length] }} />{p.name}<span style={styles.tileCount}>13 tiles</span></div>)}
      <div style={styles.mahjongCenter}>{['🀄','🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'].map((t, i) => <span key={i} style={{ ...styles.tile, transform: `rotate(${(i - 5) * 2}deg)` }}>{t}</span>)}</div>
    </div>
  </div>;
}

function TreasureVisual({ colors, progress }: { colors: string[]; progress: number }) {
  return <svg viewBox="0 0 800 620" style={styles.svg} role="img" aria-label="Treasure Hunt map">
    <rect width="800" height="620" rx="28" fill="#123d45" />
    <path d="M70 120Q180 50 290 125T520 115T730 170L690 500Q540 555 420 490T190 525L75 430Z" fill="#d9b87a" stroke="#f1d59c" strokeWidth="8" />
    <path d="M120 380Q240 290 330 350T520 310T660 390" fill="none" stroke="#6f5a36" strokeWidth="10" strokeDasharray="18 12" />
    {[[170,180],[310,400],[520,180],[620,430],[420,280]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="20" fill={colors[i%colors.length]} stroke="#fff" strokeWidth="4"/><text x={x} y={y+7} textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff">{i+1}</text></g>)}
    <text x="400" y="95" textAnchor="middle" fontSize="32" fontWeight="900" fill="#fff7db">TREASURE HUNT</text>
    <text x="400" y="560" textAnchor="middle" fontSize="16" fill="#f1d59c">{Math.min(5, Math.ceil(progress / 6))} / 5 locations explored</text>
  </svg>;
}

function MonopolyVisual({ properties, owned, positions, houses, colors, city, players, lastRoll, onSelectSpace }: { properties: MonopolyProperty[]; owned: Record<string, string | null>; positions: Record<string, number>; houses: Record<string, number>; colors: string[]; city: string; players: { id: string; name: string; seat: number }[]; lastRoll: [number, number] | null; onSelectSpace: (index:number)=>void }) {
  const [animated, setAnimated] = useState<Record<string, number>>(positions);
  const [moving, setMoving] = useState<string | null>(null);
  const animatedRef = useRef(animated);
  useEffect(() => { animatedRef.current = animated; }, [animated]);

  useEffect(() => {
    const changes = Object.entries(positions).filter(([id, pos]) => animatedRef.current[id] !== pos);
    if (!changes.length) return;
    const [id, target] = changes[0];
    const from = animatedRef.current[id] ?? 0;
    const distance = (target - from + 40) % 40;
    if (distance === 0) {
      animatedRef.current = { ...animatedRef.current, [id]: target };
      setAnimated(a => ({ ...a, [id]: target }));
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      animatedRef.current = { ...animatedRef.current, [id]: target };
      setAnimated(a => ({ ...a, [id]: target }));
      return;
    }
    setMoving(id);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const nextPosition = (from + step) % 40;
      animatedRef.current = { ...animatedRef.current, [id]: nextPosition };
      setAnimated(a => ({ ...a, [id]: nextPosition }));
      if (step >= distance) {
        window.clearInterval(timer);
        setMoving(null);
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [positions]);

  const spaces = useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);
  const boardX = 28;
  const boardY = 28;
  const boardSize = 844;
  const corner = 154;
  const side = (boardSize - corner * 2) / 9;
  const inner = boardX + corner;
  const innerEnd = boardX + boardSize - corner;

  const rectFor = (i: number) => {
    if (i === 0) return { x: innerEnd, y: innerEnd, w: corner, h: corner, side: 'bottom' as const, corner: true };
    if (i === 10) return { x: boardX, y: innerEnd, w: corner, h: corner, side: 'left' as const, corner: true };
    if (i === 20) return { x: boardX, y: boardY, w: corner, h: corner, side: 'top' as const, corner: true };
    if (i === 30) return { x: innerEnd, y: boardY, w: corner, h: corner, side: 'right' as const, corner: true };
    if (i > 0 && i < 10) return { x: innerEnd - i * side, y: innerEnd, w: side, h: corner, side: 'bottom' as const, corner: false };
    if (i > 10 && i < 20) return { x: boardX, y: innerEnd - (i - 10) * side, w: corner, h: side, side: 'left' as const, corner: false };
    if (i > 20 && i < 30) return { x: boardX + corner + (i - 21) * side, y: boardY, w: side, h: corner, side: 'top' as const, corner: false };
    return { x: innerEnd, y: inner + (i - 30) * side, w: corner, h: side, side: 'right' as const, corner: false };
  };
  const pointFor = (i: number) => { const r = rectFor(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
  const displayName = (p: MonopolyProperty | undefined, i: number) => {
    if (i === 0) return 'GO';
    if (i === 10) return 'JAIL / VISIT';
    if (i === 20) return 'FREE PARKING';
    if (i === 30) return 'GO TO JAIL';
    return p?.name ?? '';
  };
  const specialGlyph = (type: string) => type === 'railroad' ? '▰' : type === 'utility' ? '⚡' : type === 'chance' ? '?' : type === 'chest' ? '▣' : type === 'tax' ? '¤' : '';
  const playerColor = (id: string, fallback: number) => {
    const p = players.find(x => x.id === id);
    return colors[(p?.seat ?? fallback) % colors.length];
  };

  return <svg viewBox="0 0 900 900" style={styles.svg} role="img" aria-label={`${city} property trading board`}>
    <defs>
      <linearGradient id="hyeMonoWood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4b2e20" /><stop offset=".5" stopColor="#7b5034" /><stop offset="1" stopColor="#382319" /></linearGradient>
      <linearGradient id="hyeMonoPaper" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f7f0d8" /><stop offset="1" stopColor="#e5d9b9" /></linearGradient>
      <linearGradient id="hyeMonoCenter" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8ead4" /><stop offset="1" stopColor="#b9d7c0" /></linearGradient>
      <filter id="hyeMonoShadow"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity=".3" /></filter>
      <filter id="hyeMonoToken"><feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity=".5" /></filter>
    </defs>

    {/* Physical-board frame and classic pale play surface. */}
    <rect x="8" y="8" width="884" height="884" rx="30" fill="url(#hyeMonoWood)" filter="url(#hyeMonoShadow)" />
    <rect x="18" y="18" width="864" height="864" rx="24" fill="#c7a96d" stroke="#e9d6a4" strokeWidth="3" />
    <rect x={boardX - 6} y={boardY - 6} width={boardSize + 12} height={boardSize + 12} rx="6" fill="url(#hyeMonoPaper)" stroke="#513a28" strokeWidth="5" />

    {spaces.map(i => {
      const r = rectFor(i);
      const p = properties[i];
      const owner = p ? owned[p.id] : null;
      const gc = groupColors[p?.group ?? 'corner'] ?? '#7b766d';
      const name = displayName(p, i);
      const glyph = p ? specialGlyph(p.type) : '';
      const isProperty = !!p && p.type === 'property';
      const housesCount = p?.type === 'property' ? (houses[p.id] ?? 0) : 0;
      const stripeH = r.corner ? 0 : Math.min(31, r.h * .23);
      const vertical = r.side === 'left' || r.side === 'right';
      return <g key={i} role="button" tabIndex={0} aria-label={`View ${name} details`} onClick={()=>onSelectSpace(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectSpace(i);}}} style={{cursor:'pointer'}}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#faf6e9" stroke="#473827" strokeWidth="2" />
        {isProperty && (r.side === 'left' || r.side === 'right') ? <rect x={r.side === 'left' ? r.x + r.w - 27 : r.x + 4} y={r.y + 4} width={23} height={r.h - 8} fill={gc} stroke="#473827" strokeWidth="1" /> : isProperty && <rect x={r.x + 4} y={r.side === 'top' ? r.y + r.h - stripeH - 4 : r.y + 4} width={r.w - 8} height={stripeH} fill={gc} stroke="#473827" strokeWidth="1" />}
        {!r.corner && p?.type === 'railroad' && <text x={r.x + r.w / 2} y={r.y + r.h * .43} textAnchor="middle" fontSize="24" fontWeight="900" fill="#29241f">▰</text>}
        {!r.corner && p?.type === 'utility' && <text x={r.x + r.w / 2} y={r.y + r.h * .43} textAnchor="middle" fontSize="23" fontWeight="900" fill="#285c52">⚡</text>}
        {!r.corner && (p?.type === 'chance' || p?.type === 'chest') && <g>
          <rect x={r.x + r.w * .22} y={r.y + r.h * .29} width={r.w * .56} height={r.h * .36} rx="4" fill={p.type === 'chance' ? '#d89443' : '#4e7da0'} stroke="#473827" strokeWidth="2" transform={`rotate(${r.side === 'left' ? -90 : r.side === 'right' ? 90 : 0} ${r.x + r.w / 2} ${r.y + r.h / 2})`} />
          <text x={r.x + r.w / 2} y={r.y + r.h * .55} textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff">{glyph}</text>
        </g>}
        {!r.corner && p?.type === 'tax' && <text x={r.x + r.w / 2} y={r.y + r.h * .48} textAnchor="middle" fontSize="24" fontWeight="900" fill="#8b5638">¤</text>}
        {r.corner ? <g>
          {i === 0 && <>
            <text x={r.x + r.w / 2} y={r.y + 43} textAnchor="middle" fontSize="34" fontWeight="1000" fill="#2d6d45" transform={`rotate(-8 ${r.x + r.w / 2} ${r.y + 43})`}>GO</text>
            <path d={`M${r.x + 32} ${r.y + 88}L${r.x + 76} ${r.y + 62}L${r.x + 76} ${r.y + 100}L${r.x + 122} ${r.y + 72}`} fill="none" stroke="#2d6d45" strokeWidth="8" strokeLinecap="round" />
            <text x={r.x + r.w / 2} y={r.y + 137} textAnchor="middle" fontSize="11" fontWeight="900" fill="#4d3b2c">COLLECT $200</text>
          </>}
          {i === 10 && <>
            <rect x={r.x + 24} y={r.y + 26} width="105" height="105" fill="#e7d5aa" stroke="#684d36" strokeWidth="3" />
            <path d={`M${r.x + 43} ${r.y + 110}V${r.y + 72}L${r.x + 77} ${r.y + 48}L${r.x + 111} ${r.y + 72}V${r.y + 110}`} fill="#b84e45" stroke="#4c3829" strokeWidth="4" />
            <circle cx={r.x + 77} cy={r.y + 82} r="11" fill="#f7edcf" stroke="#4c3829" strokeWidth="3" />
            <text x={r.x + r.w / 2} y={r.y + 146} textAnchor="middle" fontSize="13" fontWeight="1000" fill="#33261d">JAIL / VISIT</text>
          </>}
          {i === 20 && <>
            <text x={r.x + r.w / 2} y={r.y + 38} textAnchor="middle" fontSize="20" fontWeight="1000" fill="#6b5535">FREE</text>
            <text x={r.x + r.w / 2} y={r.y + 61} textAnchor="middle" fontSize="20" fontWeight="1000" fill="#6b5535">PARKING</text>
            <rect x={r.x + 34} y={r.y + 80} width="86" height="46" rx="6" fill="#f1e4c3" stroke="#7b6547" strokeWidth="3" />
            <text x={r.x + r.w / 2} y={r.y + 110} textAnchor="middle" fontSize="27" fontWeight="900" fill="#5b765e">P</text>
          </>}
          {i === 30 && <>
            <text x={r.x + r.w / 2} y={r.y + 42} textAnchor="middle" fontSize="17" fontWeight="1000" fill="#a7463f" transform={`rotate(90 ${r.x + r.w / 2} ${r.y + 42})`}>GO TO</text>
            <text x={r.x + r.w / 2} y={r.y + 112} textAnchor="middle" fontSize="25" fontWeight="1000" fill="#a7463f" transform={`rotate(90 ${r.x + r.w / 2} ${r.y + 112})`}>JAIL</text>
            <path d={`M${r.x + 112} ${r.y + 24}L${r.x + 78} ${r.y + 70}L${r.x + 112} ${r.y + 116}`} fill="none" stroke="#a7463f" strokeWidth="7" strokeLinecap="round" />
          </>}
        </g> : <>
          {vertical ? <g transform={`translate(${r.x + r.w / 2} ${r.y + r.h / 2}) rotate(${r.side === 'left' ? -90 : 90})`}>
            <text x="0" y="-2" textAnchor="middle" fontSize="8" fontWeight="900" fill="#30281f">{name.length > 17 ? `${name.slice(0, 16)}…` : name}</text>
            {p?.type !== 'chance' && p?.type !== 'chest' && p?.type !== 'railroad' && p?.type !== 'utility' && p?.type !== 'tax' && <text x="0" y="12" textAnchor="middle" fontSize="7" fill="#665440">${p?.price ?? ''}</text>}
          </g> : <>
            <text x={r.x + r.w / 2} y={r.y + (r.side === 'top' ? 18 : stripeH + 18)} textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#30281f">{name.length > 17 ? `${name.slice(0, 16)}…` : name}</text>
            {p?.type !== 'chance' && p?.type !== 'chest' && p?.type !== 'railroad' && p?.type !== 'utility' && p?.type !== 'tax' && <text x={r.x + r.w / 2} y={r.side === 'top' ? r.y + r.h - stripeH - 10 : r.y + r.h - 12} textAnchor="middle" fontSize="7.5" fill="#665440">${p?.price ?? ''}</text>}
          </>}
          {owner && <circle cx={r.x + (r.side === 'left' ? r.w - 12 : r.side === 'right' ? 12 : r.w / 2)} cy={r.y + (r.side === 'top' ? 12 : r.side === 'bottom' ? r.h - 12 : r.h / 2)} r="6" fill={playerColor(owner, 0)} stroke="#fff" strokeWidth="2" />}
          {isProperty && housesCount > 0 && <g>
            {housesCount >= 5 ? <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" fontSize="12" fontWeight="1000" fill="#27633c">HOTEL</text> : Array.from({ length: housesCount }, (_, h) => <rect key={h} x={r.x + 7 + h * 8} y={r.y + r.h / 2 - 3} width="6" height="6" rx="1" fill="#2c7045" stroke="#17432b" strokeWidth="1" />)}
          </g>}
        </>}
      </g>;
    })}

    {/* Center panel: deliberately original Hye Arcade branding, not the proprietary Monopoly logo/art. */}
    <rect x={inner + 12} y={inner + 12} width={boardSize - corner * 2 - 24} height={boardSize - corner * 2 - 24} rx="10" fill="url(#hyeMonoCenter)" stroke="#5a765f" strokeWidth="3" />
    <path d={`M${inner + 38} ${inner + 92}H${innerEnd - 38} M${inner + 38} ${innerEnd - 92}H${innerEnd - 38}`} stroke="#8aa78e" strokeWidth="2" opacity=".65" />
    <g transform={`translate(${inner + 290} ${inner + 120}) rotate(-8)`}>
      <rect x="-190" y="-38" width="380" height="76" rx="8" fill="#d54d3f" stroke="#7e3029" strokeWidth="5" />
      <text x="0" y="15" textAnchor="middle" fontFamily="Georgia,serif" fontSize="42" fontWeight="1000" letterSpacing="6" fill="#fff5df">HYE CITY</text>
    </g>
    <text x={inner + 290} y={inner + 205} textAnchor="middle" fontSize="12" fontWeight="1000" letterSpacing="4" fill="#46604b">PROPERTY TRADING GAME</text>

    <g transform={`translate(${inner + 100} ${inner + 270}) rotate(-12)`}>
      <rect x="4" y="5" width="156" height="104" rx="10" fill="#241e19" opacity=".22" />
      <rect width="156" height="104" rx="10" fill="#fff8e8" stroke="#9a6927" strokeWidth="3" />
      <rect x="4" y="4" width="148" height="96" rx="7" fill="none" stroke="#e2b45f" strokeWidth="1.5" />
      <path d="M0 10Q0 0 10 0H146Q156 0 156 10V29H0Z" fill="#c9822d" />
      <circle cx="18" cy="15" r="7" fill="#fff0c9" /><text x="18" y="19" textAnchor="middle" fontSize="11" fontWeight="1000" fill="#8b501e">?</text>
      <text x="86" y="20" textAnchor="middle" fontSize="12" fontWeight="1000" letterSpacing="2" fill="#fff8e8">CHANCE</text>
      <path d="M25 43H131" stroke="#e6c98c" strokeWidth="1.5" />
      <path d="M78 48L99 69L78 90L57 69Z" fill="#f4e0b5" stroke="#d9aa59" strokeWidth="2" />
      <text x="78" y="79" textAnchor="middle" fontSize="31" fontWeight="1000" fill="#bd7927">?</text>
      <text x="78" y="98" textAnchor="middle" fontSize="7" fontWeight="900" letterSpacing="1.4" fill="#8c6c43">FATE • RISK • REWARD</text>
    </g>
    <g transform={`translate(${inner + 335} ${inner + 315}) rotate(9)`}>
      <rect x="4" y="5" width="156" height="104" rx="10" fill="#241e19" opacity=".22" />
      <rect width="156" height="104" rx="10" fill="#fff8e8" stroke="#365e7a" strokeWidth="3" />
      <rect x="4" y="4" width="148" height="96" rx="7" fill="none" stroke="#8ab0cb" strokeWidth="1.5" />
      <path d="M0 10Q0 0 10 0H146Q156 0 156 10V29H0Z" fill="#3f7399" />
      <rect x="10" y="8" width="15" height="15" rx="3" fill="#e6f4ff" /><path d="M13 12H22M13 16H22M13 20H19" stroke="#3f7399" strokeWidth="1.5" />
      <text x="91" y="13" textAnchor="middle" fontSize="8" fontWeight="1000" letterSpacing="1.2" fill="#fff">COMMUNITY</text>
      <text x="91" y="23" textAnchor="middle" fontSize="8" fontWeight="1000" letterSpacing="1.8" fill="#fff">CHEST</text>
      <path d="M25 43H131" stroke="#a9c9dc" strokeWidth="1.5" />
      <rect x="48" y="49" width="60" height="35" rx="5" fill="#d8e8f1" stroke="#6d9ab5" strokeWidth="2" />
      <path d="M44 49L78 39L112 49" fill="#a7c7da" stroke="#6d9ab5" strokeWidth="2" />
      <rect x="74" y="63" width="8" height="21" rx="2" fill="#3f7399" />
      <text x="78" y="98" textAnchor="middle" fontSize="7" fontWeight="900" letterSpacing="1.3" fill="#456a80">A LITTLE LUCK FROM THE BANK</text>
    </g>
    <g transform={`translate(${inner + 160} ${inner + 390})`}>
      <circle cx="50" cy="50" r="43" fill="#f7efe0" stroke="#66513a" strokeWidth="4" />
      <circle cx="50" cy="50" r="31" fill="#fff" stroke="#aaa" strokeWidth="2" />
      <circle cx="50" cy="50" r="4" fill="#30281f" />
      <path d="M50 50L66 42M50 50L45 66" stroke="#30281f" strokeWidth="3" strokeLinecap="round" />
      <text x="50" y="112" textAnchor="middle" fontSize="11" fontWeight="900" fill="#536b59">CITY TIME</text>
    </g>
    <g transform={`translate(${inner + 365} ${inner + 425})`}>
      <rect width="116" height="72" rx="12" fill="#f7efe0" stroke="#66513a" strokeWidth="3" />
      <rect x="12" y="12" width="38" height="38" rx="7" fill="#fff" stroke="#7d6c56" strokeWidth="2" />
      <rect x="66" y="12" width="38" height="38" rx="7" fill="#fff" stroke="#7d6c56" strokeWidth="2" />
      {lastRoll && <><circle cx={31 + (lastRoll[0] % 2) * 6} cy="31" r="4" fill="#332a20" /><circle cx="85" cy={31 + (lastRoll[1] % 2) * 6} r="4" fill="#332a20" /></>}
      <text x="58" y="64" textAnchor="middle" fontSize="10" fontWeight="1000" fill="#4b3c29">{lastRoll ? `${lastRoll[0]} + ${lastRoll[1]}` : 'ROLL 2 DICE'}</text>
    </g>
    <text x={inner + 290} y={innerEnd - 22} textAnchor="middle" fontSize="10" fontWeight="900" letterSpacing="2" fill="#5d735f">40 SPACES • 28 PROPERTIES • 4 RAILROADS • 2 UTILITIES</text>

    {Object.entries(animated).map(([id, pos], i) => {
      const point = pointFor(Number(pos));
      const player = players.find(p => p.id === id);
      const color = colors[(player?.seat ?? i) % colors.length];
      return <g key={id} filter="url(#hyeMonoToken)">
        <circle cx={point.x} cy={point.y} r="13" fill={color} stroke="#fff" strokeWidth="3" />
        <circle cx={point.x - 4} cy={point.y - 4} r="4" fill="#fff" opacity=".85" />
        <text x={point.x} y={point.y + 25} textAnchor="middle" fontSize="7.5" fontWeight="1000" fill="#30271e">{player?.name ?? id}{moving === id ? ' •' : ''}</text>
      </g>;
    })}
  </svg>;
}
const styles: Record<string, CSSProperties> = {
  overlay: { position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(0,0,0,.72)', backdropFilter:'blur(8px)' },
  modalPanel: { width:'min(520px, 100%)', maxHeight:'85dvh', overflow:'hidden', display:'flex', flexDirection:'column', border:'1px solid rgba(255,255,255,.15)', borderRadius:18, background:'#171b20', color:'#f5f2ea', boxShadow:'0 24px 80px rgba(0,0,0,.55)' },
  modalHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:16, borderBottom:'1px solid rgba(255,255,255,.1)' },
  closeButton: { minHeight:40, padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)' },
  historyList: { padding:12, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 },
  historyItem: { display:'grid', gridTemplateColumns:'28px minmax(0,1fr)', gap:10, alignItems:'start', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.045)', fontSize:13, lineHeight:1.4, overflowWrap:'anywhere' },
  historyIndex: { color:'#d9b45b', fontWeight:900, fontVariantNumeric:'tabular-nums' },
  propertyDetails: { padding:16, overflowY:'auto', display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 },
  detailCell: { display:'flex', flexDirection:'column', gap:4, minWidth:0, padding:10, borderRadius:10, background:'rgba(255,255,255,.045)', overflowWrap:'anywhere' },
  detailLabel: { fontSize:11, color:tokens.text.muted, textTransform:'uppercase', letterSpacing:1 },
  monopolyActions: { position:'fixed', inset:0, zIndex:170, alignItems:'center', justifyContent:'center', padding:'max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))', background:'rgba(5,5,10,.76)', backdropFilter:'blur(9px)', WebkitBackdropFilter:'blur(9px)' },
  monopolyActionPanel: { display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:8, width:'min(620px,100%)', maxHeight:'84dvh', overflowY:'auto', padding:16, borderRadius:22, border:'1px solid rgba(255,255,255,.17)', background:'rgba(24,23,32,.98)', boxShadow:'0 28px 90px rgba(0,0,0,.65)', minWidth:0 },
  monopolyMainControls: { display:'flex', justifyContent:'center', alignItems:'stretch', gap:10, flexWrap:'wrap', width:'100%' },
  monopolyRollButton: { minHeight:50, padding:'12px 24px', borderRadius:16, border:'1px solid rgba(255,232,163,.55)', background:'linear-gradient(135deg,#f4d477,#c18a34)', color:'#241b10', fontSize:16, fontWeight:1000, letterSpacing:.5, boxShadow:'0 10px 24px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.45)' },
  monopolyMoreButton: { minHeight:50, padding:'12px 18px', borderRadius:16, border:'1px solid rgba(255,255,255,.16)', background:'linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.04))', color:tokens.text.primary, fontWeight:900 },
  propertyDecisionGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap:9, width:'100%' },
  propertyDecisionSummary: { gridColumn:'1 / -1', display:'grid', gap:5, padding:14, borderRadius:14, background:'linear-gradient(135deg,rgba(232,185,92,.15),rgba(255,255,255,.035))', border:'1px solid rgba(232,185,92,.24)' },
  eventTitle: { width:'100%', fontSize:11, fontWeight:1000, letterSpacing:2, textTransform:'uppercase', color:tokens.text.secondary },
  eventItem: { display:'grid', gridTemplateColumns:'28px minmax(0,1fr)', gap:10, alignItems:'start', width:'100%', padding:'9px 11px', borderRadius:12, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.06)', overflowWrap:'anywhere' },
  eventIndex: { display:'grid', placeItems:'center', width:24, height:24, borderRadius:8, background:'rgba(232,185,92,.14)', color:'#e8b95c', fontSize:11, fontWeight:1000 },
  monopolyMoney: { width: '100%', textAlign: 'center', color: tokens.text.secondary, fontSize: 13, fontWeight: 700 },
  tradeInput: { minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(0,0,0,.15)', color: 'inherit' } as CSSProperties,
  secondaryAction: { padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', color: tokens.text.primary, fontWeight: 800, minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere' },
  action: { padding: '11px 18px', borderRadius: 12, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.surface, color: tokens.text.primary, fontWeight: 900, whiteSpace: 'nowrap' },
  svg: { width: '100%', height: '100%', display: 'block', maxHeight: 'min(84dvh, 900px)', objectFit: 'contain' },
  visual: { minHeight: 420, width: '100%', maxWidth: 920, padding: 'clamp(18px, 4vw, 48px)', display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  bigTitle: { fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' },
  progress: { display: 'flex', gap: 8 },
  dot: { width: 16, height: 16, borderRadius: '50%' },
  cards: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  card: { width: 72, height: 104, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 34, color: '#fff', boxShadow: '0 14px 30px rgba(0,0,0,.28)' },
  infoStrip: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  infoChip: { display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 999, background: 'rgba(20,18,28,.75)', border: `1px solid ${tokens.bg.border}`, color: tokens.text.primary, fontSize: 12, fontWeight: 800 },
  infoDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  log: { display: 'grid', gap: 8, width:'100%', maxWidth:920, margin:'0 auto', padding:'12px clamp(10px,2vw,20px) 18px', color: tokens.text.primary, fontSize: 12, justifyContent: 'stretch', borderRadius:18, background:'linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015))', border:'1px solid rgba(255,255,255,.08)' },
  mahjongWrap: { width: '100%', maxWidth: 900, padding: 24, boxSizing: 'border-box' },
  mahjongTitle: { textAlign: 'center', color: '#d7b85a', fontWeight: 900, letterSpacing: 4, marginBottom: 18 },
  mahjongTable: { position: 'relative', minHeight: 520, borderRadius: 28, background: 'linear-gradient(145deg,#2d725d,#173e34)', border: '10px solid #9c7544', boxShadow: 'inset 0 0 60px rgba(0,0,0,.35), 0 20px 50px rgba(0,0,0,.35)' },
  mahjongPlayer: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 12px', background: '#14121cdd', borderRadius: 999, display: 'flex', gap: 7, alignItems: 'center', fontWeight: 800, color: '#fff' },
  mahjongBottom: { top: 'auto', bottom: 16 },
  tileCount: { color: '#a8a2b8', fontSize: 10, marginLeft: 5 },
  mahjongCenter: { position: 'absolute', inset: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' },
  tile: { width: 44, height: 58, borderRadius: 7, background: '#f5f0df', color: '#2b2b2b', display: 'grid', placeItems: 'center', boxShadow: '0 5px 10px rgba(0,0,0,.25)', fontSize: 27 },

  coreHint: { color: '#d9b84c', fontWeight: 800, padding: '8px 12px' },
  coreBoardWrap: { width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  chessGrid: { width: 'min(96vw, calc(100dvh - 200px), 760px)', aspectRatio: '1 / 1', display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', border: '8px solid #2a2020', borderRadius: 14, overflow: 'hidden' },
  chessCell: { border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  goCell: { border: 0, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  scrabbleWrap: { width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  scrabbleGrid: { width: 'min(98vw, calc(100dvh - 190px), 760px)', aspectRatio: '1 / 1', display: 'grid', gridTemplateColumns: 'repeat(15,1fr)', border: '6px solid #6e4d30', background: '#6e4d30', gap: 1 },
  scrabbleCell: { minWidth: 0, display: 'grid', placeItems: 'center', fontSize: 'clamp(8px,2vw,16px)', fontWeight: 900 },
  rack: { display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' },
  rackTile: { width: 42, height: 48, border: '1px solid #8d6b40', borderRadius: 6, background: '#f4e1ad', fontWeight: 900, fontSize: 18, cursor: 'pointer' },
  rackTileSmall: { fontSize: 9 },
  scrabbleControls: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  input: { minWidth: 130, padding: '10px 12px', borderRadius: 8, border: '1px solid #555', background: '#15131a', color: '#fff', fontWeight: 800 },
  coord: { width: 54, padding: '10px 4px', borderRadius: 8, border: '1px solid #555', background: '#15131a', color: '#fff' },
  mahjongInteractive: { width: '100%', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: 16 },
  wallInfo: { fontWeight: 900, color: '#d7b85a' },
  mahjongHand: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 900 },
  tileButton: { minWidth: 44, height: 58, borderRadius: 7, border: '1px solid #8c7448', background: '#f3e5bf', color: '#1c3b2e', fontWeight: 900, fontSize: 15, cursor: 'pointer' },
  mahjongControls: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },

};
