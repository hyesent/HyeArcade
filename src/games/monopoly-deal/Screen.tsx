import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ScreenProps } from '../../core/screen';
import { Cabinet, Marquee, Bezel, Stage, ControlDeck, PlayerPips, TurnBadge, ActionBar } from '../../core/screen';
import type { MonopolyDealState, MonopolyDealMove, MDColor } from './types';
import type { Move } from '../../core/types';

const colors: MDColor[] = ['brown','lightBlue','pink','orange','red','yellow','green','darkBlue','railroad','utility'];
const colorNames: Record<MDColor,string> = { brown:'Brown',lightBlue:'Light blue',pink:'Pink',orange:'Orange',red:'Red',yellow:'Yellow',green:'Green',darkBlue:'Dark blue',railroad:'Railroad',utility:'Utility' };
const colorSwatches: Record<MDColor,string> = { brown:'#8b5a3c',lightBlue:'#77c5e7',pink:'#d98fbd',orange:'#ed984d',red:'#d94c56',yellow:'#e7c94d',green:'#5aa66d',darkBlue:'#4f6fb6',railroad:'#777783',utility:'#56a6a1' };

export function MonopolyDealScreen(props: ScreenProps<MonopolyDealState>) {
  const { game, session, currentId, isMyTurn, onMove, onReset, onExit, accent } = props;
  const s = session.state;
  const [target, setTarget] = useState('');
  const [targetCardId, setTargetCardId] = useState('');
  const [color, setColor] = useState<MDColor>('brown');
  const [selectedPayment, setSelectedPayment] = useState<string[]>([]);
  const hand = s.hands[currentId ?? ''] ?? [];
  const card = (id: string) => s.cards[id];
  const send = (payload: MonopolyDealMove) => {
    if (!currentId) return;
    const move: Move<MonopolyDealMove> = { type: payload.action, player: currentId, payload, ts: Date.now() };
    onMove(move);
  };
  const setCount = (playerId: string) => colors.filter(c => (s.properties[playerId] ?? []).filter(id => (s.wildColors[id] ?? card(id)?.colors?.[0]) === c).length >= (c === 'brown' || c === 'darkBlue' || c === 'utility' ? 2 : c === 'railroad' ? 4 : 3)).length;
  const targetProperties = target ? s.properties[target] ?? [] : [];
  const assets = currentId ? [...(s.bank[currentId] ?? []), ...(s.properties[currentId] ?? [])] : [];
  const selectedValue = selectedPayment.reduce((sum,id) => sum + (card(id)?.value ?? 0), 0);
  const canPlay = isMyTurn && s.hasDrawn && s.playsLeft > 0 && !s.pending && session.status === 'playing';
  const targetRequired = (c: NonNullable<ReturnType<typeof card>>) => c.kind === 'rent' || ['debtCollector','slyDeal','forcedDeal','dealBreaker'].includes(c.action ?? '');
  const needsTargetCard = (c: NonNullable<ReturnType<typeof card>>) => ['slyDeal','forcedDeal'].includes(c.action ?? '');
  const selectedTargetCard = targetCardId && targetProperties.includes(targetCardId);

  useEffect(() => {
    if (!target || !session.players.some(player => player.id === target && player.id !== currentId)) {
      setTarget(session.players.find(player => player.id !== currentId)?.id ?? '');
      setTargetCardId('');
    }
  }, [currentId, session.players, target]);
  useEffect(() => { setSelectedPayment([]); }, [s.pending?.targetPlayer, s.pending?.cardId, s.pending?.amount]);
  useEffect(() => { if (targetCardId && !targetProperties.includes(targetCardId)) setTargetCardId(''); }, [targetCardId, targetProperties]);

  const playCard = (id: string) => {
    const c = card(id);
    if (!c || !canPlay) return;
    if (c.kind === 'money') {
      send({ action:'playMoney', cardId:id });
      return;
    }
    if (c.kind === 'property' || c.kind === 'wild') {
      const chosenColor = c.colors?.includes(color) ? color : c.colors?.[0];
      if (chosenColor) send({ action:'playProperty', cardId:id, color:chosenColor });
      return;
    }
    if (c.action === 'justSayNo') return;
    if (targetRequired(c) && (!target || target === currentId)) return;
    if (needsTargetCard(c) && !selectedTargetCard) return;
    if (c.kind === 'rent') send({ action:'playAction', cardId:id, target, color } as MonopolyDealMove);
    else if (['debtCollector','slyDeal','forcedDeal','dealBreaker'].includes(c.action ?? '')) {
      send({ action:'playAction', cardId:id, target, targetCardId: needsTargetCard(c) ? targetCardId : undefined, color } as MonopolyDealMove);
    } else send({ action:'playAction', cardId:id, color } as MonopolyDealMove);
  };

  const bankCard = (id: string) => {
    if (!canPlay) return;
    send({ action:'playMoney', cardId:id });
  };

  const pay = (useJustSayNo?: string) => {
    if (useJustSayNo) send({ action:'respond', accept:false, cardId:useJustSayNo } as MonopolyDealMove);
    else send({ action:'respond', accept:false, ...(selectedPayment.length ? { cardIds:selectedPayment } : {}) } as MonopolyDealMove);
  };

  const logRows = useMemo(() => [...s.log].slice(-4).reverse(), [s.log]);
  const activePlayer = session.players.find(player => player.id === currentId)?.name ?? 'Player';

  return <Cabinet accent={accent}>
    <Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset} />
    <Bezel accent={accent} aspectRatio="16 / 10">
      <Stage accent={accent}>
        <div style={ui.root}>
          <div style={ui.topLine}>
            <div><span style={ui.eyebrow}>{s.won ? 'MATCH COMPLETE' : `TURN · ${activePlayer.toUpperCase()}`}</span><h2 style={ui.heading}>{s.won ? `${session.players.find(p => p.id === s.won)?.name ?? 'Player'} wins` : 'Property Deal'}</h2></div>
            <div style={ui.playsBadge}>{s.hasDrawn ? `${s.playsLeft} plays left` : 'Draw 2 cards'}</div>
          </div>
          <div style={ui.logStrip} aria-label="Recent match events">{logRows.length ? logRows.map((entry,index)=><span key={`${index}-${entry}`} style={ui.logItem}><b>{logRows.length-index}</b><span>{entry.replaceAll(currentId ?? '', 'You')}</span></span>) : <span style={ui.logItem}><b>•</b><span>Build three complete property sets to win.</span></span>}</div>

          <div style={ui.playerGrid}>
            {session.players.map(player => <article key={player.id} style={{...ui.playerCard,borderColor:player.id===currentId?'rgba(232,185,92,.42)':'rgba(255,255,255,.1)'}}>
              <div style={ui.playerCardTop}><strong>{player.id===currentId?'You':player.name}</strong><span style={ui.countPill}>{(s.hands[player.id]??[]).length} cards</span></div>
              <div style={ui.playerMetrics}><span>Bank <b>{(s.bank[player.id]??[]).reduce((sum,id)=>sum+(card(id)?.value??0),0)}M</b></span><span>Sets <b>{setCount(player.id)}/3</b></span><span>Properties <b>{(s.properties[player.id]??[]).length}</b></span></div>
              <div style={ui.miniProperties}>{(s.properties[player.id]??[]).slice(0,8).map(id=><span key={id} style={{...ui.propertyDot,background:colorSwatches[(s.wildColors[id]??card(id)?.colors?.[0]) as MDColor]??'rgba(255,255,255,.16)'}} title={card(id)?.name ?? 'Property'} />)}{(s.properties[player.id]??[]).length>8&&<small>+{s.properties[player.id].length-8}</small>}</div>
            </article>)}
          </div>

          {s.pending && s.pending.targetPlayer === currentId && <section style={ui.pendingBox}>
            <div style={ui.pendingHeading}><div><span style={ui.eyebrow}>PAYMENT REQUEST</span><h3 style={{margin:'3px 0 0',fontSize:18}}>{session.players.find(p=>p.id===s.pending?.sourcePlayer)?.name ?? 'A player'} requests {s.pending.amount}M</h3></div><span style={ui.countPill}>{selectedPayment.length ? `${selectedValue}M selected` : 'Auto-pay available assets'}</span></div>
            <p style={ui.helpText}>Select bank or property cards to pay with. Leave none selected to let the game choose available assets automatically.</p>
            <div style={ui.assetGrid}>{assets.map(id=><button key={id} type="button" onClick={()=>setSelectedPayment(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])} style={{...ui.assetCard,...(selectedPayment.includes(id)?ui.assetSelected:{})}}><strong>{card(id)?.name ?? 'Asset'}</strong><small>{card(id)?.value ?? 0}M · {(s.bank[currentId!]??[]).includes(id)?'Bank':'Property'}</small></button>)}</div>
            <div style={ui.actionRow}><button type="button" style={ui.primaryButton} disabled={!isMyTurn || (selectedPayment.length>0 && selectedValue<s.pending.amount && assets.length>0)} onClick={()=>pay()}>Pay {selectedPayment.length?`${selectedValue}M`:'automatically'}</button>{hand.filter(id=>card(id)?.action==='justSayNo').map(id=><button type="button" key={id} style={ui.secondaryButton} disabled={!isMyTurn} onClick={()=>pay(id)}>Just Say No</button>)}</div>
          </section>}

          <section style={ui.handSection}>
            <div style={ui.sectionHeading}><div><span style={ui.eyebrow}>YOUR HAND</span><h3 style={{margin:'3px 0 0',fontSize:17}}>Cards in hand <span style={ui.countPill}>{hand.length}</span></h3></div><span style={ui.helperTag}>{canPlay?'Choose a card to play or bank':'Waiting for your turn'}</span></div>
            <div style={ui.handGrid}>
              {hand.map(id=>{
                const c=card(id);if(!c)return null;
                const disabled=!canPlay || (c.action==='justSayNo') || (targetRequired(c)&&!target) || (needsTargetCard(c)&&!selectedTargetCard);
                const propertyCard=c.kind==='property'||c.kind==='wild';
                return <article key={id} style={{...ui.handCard,borderTopColor:propertyCard?colorSwatches[(c.colors?.[0]??'brown') as MDColor]:'rgba(255,255,255,.24)'}}>
                  <button type="button" disabled={disabled} onClick={()=>playCard(id)} style={ui.cardPlay} aria-label={`Play ${c.name}`}>
                    <span style={ui.cardKind}>{c.kind.toUpperCase()}</span><strong>{c.name}</strong><span style={ui.cardValue}>{c.value}M</span>{c.colors?.length?<small>{c.colors.map(col=>colorNames[col]).join(' / ')}</small>:c.action?<small>{c.action.replaceAll(/([A-Z])/g,' $1')}</small>:null}
                  </button>
                  {(c.kind==='action'||c.kind==='rent')&&<button type="button" disabled={!canPlay} onClick={()=>bankCard(id)} style={ui.bankButton}>Bank card</button>}
                </article>;
              })}
              {!hand.length&&<p style={ui.helpText}>No cards in hand.</p>}
            </div>
          </section>

          <section style={ui.controls}>
            <div style={ui.selectGroup}><label style={ui.label}>Target player<select value={target} onChange={event=>{setTarget(event.target.value);setTargetCardId('');}} style={ui.select}><option value="">Choose player</option>{session.players.filter(player=>player.id!==currentId).map(player=><option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
              <label style={ui.label}>Property colour<select value={color} onChange={event=>setColor(event.target.value as MDColor)} style={ui.select}>{colors.map(value=><option key={value} value={value}>{colorNames[value]}</option>)}</select></label>
              <label style={ui.label}>Target property<select value={targetCardId} onChange={event=>setTargetCardId(event.target.value)} style={ui.select}><option value="">Choose property</option>{targetProperties.map(id=><option key={id} value={id}>{card(id)?.name ?? 'Property'}</option>)}</select></label>
            </div>
            <div style={ui.actionRow}>
              {isMyTurn&&session.status==='playing'&&s.playsLeft===0&&!s.hasDrawn&&<button type="button" onClick={()=>send({action:'draw'})} style={ui.primaryButton}>Draw 2 cards</button>}
              {isMyTurn&&session.status==='playing'&&s.hasDrawn&&hand.length<=7&&!s.pending&&<button type="button" onClick={()=>send({action:'endTurn'})} style={ui.primaryButton}>End turn</button>}
              {isMyTurn&&session.status==='playing'&&s.hasDrawn&&hand.length>7&&!s.pending&&<button type="button" onClick={()=>send({action:'discard',cardIds:hand.slice(0,hand.length-7)})} style={ui.primaryButton}>Discard {hand.length-7} extra cards</button>}
              <span style={ui.turnStatus}>{s.pending?`Waiting on ${session.players.find(p=>p.id===s.pending?.targetPlayer)?.name ?? 'player'}`:isMyTurn?'Your action':`Waiting for ${activePlayer}`}</span>
            </div>
          </section>
        </div>
      </Stage>
    </Bezel>
    <ControlDeck accent={accent}>
      <PlayerPips players={session.players} currentId={currentId} onPlayerSelect={props.onOpenPlayerProfile}/>
      <TurnBadge players={session.players} currentId={currentId} status={session.status} result={session.result} isMyTurn={isMyTurn}/>
      <ActionBar onReset={onReset}/>
    </ControlDeck>
  </Cabinet>;
}

const ui: Record<string,CSSProperties> = {
  root:{width:'min(1120px,100%)',margin:'0 auto',display:'grid',gap:12,padding:'clamp(8px,1.8vw,18px)',boxSizing:'border-box'},
  topLine:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},
  eyebrow:{fontSize:9,letterSpacing:2.4,fontWeight:900,color:'#c4b7a0'},
  heading:{margin:'3px 0 0',fontSize:'clamp(22px,3vw,30px)',letterSpacing:'-.04em'},
  playsBadge:{padding:'9px 12px',borderRadius:99,background:'rgba(232,185,92,.12)',border:'1px solid rgba(232,185,92,.24)',color:'#f0d59c',fontSize:12,fontWeight:800},
  logStrip:{display:'grid',gap:7,padding:'4px 0',color:'rgba(255,255,255,.72)',fontSize:11,whiteSpace:'normal',minWidth:0},
  logItem:{display:'grid',gridTemplateColumns:'24px minmax(0,1fr)',alignItems:'start',gap:8,padding:'8px 10px',borderRadius:11,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.035)',lineHeight:1.45,overflowWrap:'anywhere'},
  playerGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,190px),1fr))',gap:8},
  playerCard:{padding:12,borderRadius:16,border:'1px solid rgba(255,255,255,.1)',background:'linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.02)),rgba(17,20,30,.72)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',minWidth:0},
  playerCardTop:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8},
  countPill:{display:'inline-flex',alignItems:'center',padding:'3px 7px',borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',fontSize:10,color:'rgba(255,255,255,.78)',whiteSpace:'nowrap'},
  playerMetrics:{display:'flex',gap:10,flexWrap:'wrap',fontSize:11,color:'rgba(255,255,255,.6)',marginTop:9},
  miniProperties:{display:'flex',alignItems:'center',gap:4,marginTop:9,minHeight:8},
  propertyDot:{width:10,height:10,borderRadius:3,border:'1px solid rgba(255,255,255,.2)'},
  pendingBox:{display:'grid',gap:10,padding:13,borderRadius:17,border:'1px solid rgba(232,185,92,.35)',background:'linear-gradient(140deg,rgba(232,185,92,.1),rgba(255,255,255,.025))'},
  pendingHeading:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'},
  helpText:{fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.45,margin:0},
  assetGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:6},
  assetCard:{display:'grid',gap:4,minWidth:0,textAlign:'left',padding:9,borderRadius:11,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.045)',color:'inherit'},
  assetSelected:{borderColor:'rgba(232,185,92,.8)',background:'rgba(232,185,92,.14)'},
  handSection:{display:'grid',gap:9,padding:12,borderRadius:18,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.025)'},
  sectionHeading:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'},
  helperTag:{fontSize:10,color:'rgba(255,255,255,.48)'},
  handGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(118px,1fr))',gap:8},
  handCard:{minWidth:0,display:'flex',flexDirection:'column',border:'1px solid rgba(255,255,255,.13)',borderTop:'3px solid rgba(255,255,255,.25)',borderRadius:13,overflow:'hidden',background:'linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.025))'},
  cardPlay:{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:7,minHeight:100,padding:10,textAlign:'left',color:'inherit',background:'transparent'},
  cardKind:{fontSize:8,letterSpacing:1.5,color:'rgba(255,255,255,.54)',fontWeight:900},
  cardValue:{fontSize:18,fontWeight:900,color:'#f0d59c'},
  bankButton:{minHeight:32,borderTop:'1px solid rgba(255,255,255,.09)',background:'rgba(0,0,0,.15)',fontSize:10,fontWeight:800,color:'rgba(255,255,255,.72)'},
  controls:{display:'grid',gap:10,padding:12,borderRadius:17,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.025)'},
  selectGroup:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,170px),1fr))',gap:8},
  label:{display:'grid',gap:5,fontSize:10,color:'rgba(255,255,255,.58)',fontWeight:800},
  select:{width:'100%',minWidth:0,minHeight:40,padding:'8px 10px',borderRadius:10,border:'1px solid rgba(255,255,255,.14)',background:'#20202b',color:'#f6f2e9'},
  actionRow:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'},
  primaryButton:{minHeight:42,padding:'10px 14px',borderRadius:12,border:'1px solid rgba(232,185,92,.36)',background:'linear-gradient(135deg,#e9c777,#b88a3e)',color:'#211a11',fontWeight:900,fontSize:12},
  secondaryButton:{minHeight:42,padding:'10px 14px',borderRadius:12,border:'1px solid rgba(255,255,255,.16)',background:'rgba(255,255,255,.06)',color:'#f7f2e8',fontWeight:800,fontSize:12},
  turnStatus:{fontSize:11,color:'rgba(255,255,255,.52)',marginLeft:'auto'},
};
