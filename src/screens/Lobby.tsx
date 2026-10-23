import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { BotDifficulty, GameDefinition, Player } from '../core/types';
import { createLanClient, detectLanBaseUrl, type LanRoomInfo } from '../core/lan';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';
import { Icon } from '../components/Icon';
import { GameGuide } from '../games/GameGuide';
import { ChatPanel, type ChatMessage } from '../components/ChatPanel';
import { ACHIEVEMENT_CATALOG, getActiveProfile, loadLibrary, getActiveTitle } from '../profile/profileStore';
import { GAMES } from '../games/registry';
import { GAME_DESCRIPTIONS } from '../games/descriptions';

interface LobbyProps {
  game: GameDefinition<unknown, unknown>;
  onStart: (players: Player[], boardId?: string, lanRoom?: LanRoomInfo, lanClient?: ReturnType<typeof createLanClient>) => void;
  onBack: () => void;
  onSwitchGame: (gameId: string) => void;
}

const SEAT_COLORS = ['#FF9A3C', '#5FA8E8', '#4FD1A0', '#FF5C7A', '#8B7FE8', '#E8B95C'];

export function Lobby({ game, onStart, onBack, onSwitchGame }: LobbyProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messagePreview, setMessagePreview] = useState<ChatMessage | null>(null);
  const [players, setPlayers] = useState<Player[]>(() => {
    const profile = getActiveProfile();
    return [{ id: 'p1', profileId: profile.id, name: profile.name, kind: 'human', seat: 0, connected: true }];
  });
  const [boardId, setBoardId] = useState<string | undefined>(game.boards?.[0]?.id);
  const [lanOpen, setLanOpen] = useState(false);
  const [lanHost, setLanHost] = useState(false);
  const [lanName, setLanName] = useState(() => getActiveProfile().name);
  const [lanCode, setLanCode] = useState('');
  const [lanUrl, setLanUrl] = useState(detectLanBaseUrl());
  const [lanRoom, setLanRoom] = useState<LanRoomInfo | null>(null);
  const [lanBusy, setLanBusy] = useState(false);
  const [lanNotice, setLanNotice] = useState('');
  const lanClient = useState(() => createLanClient())[0];
  useEffect(() => { setBoardId(game.boards?.[0]?.id); }, [game.id]);
  useEffect(() => lanClient.onMessage(m => { if(m.type==='host'){ setLanHost(m.player===lanClient.clientId); setLanRoom(prev=>prev?{...prev,host:m.player===lanClient.clientId}:prev); } if(m.type==='leave'){const departed=players.find(p=>p.id===m.player);setLanNotice(`${departed?.name ?? m.name ?? 'A player'} disconnected.`);} if(m.type==='session'){ setLanRoom(prev => prev ? {...prev, session:m.session, host:lanClient.isHost()} : prev); if(m.session.gameId!==game.id){onSwitchGame(m.session.gameId);} setPlayers(prev => { const bots = lanClient.isHost() && m.session.status === 'lobby' ? prev.filter(p => p.kind === 'bot') : []; const seen = new Set<string>(); return [...m.session.players, ...bots].filter(p=>{if(!p?.id||seen.has(p.id))return false;seen.add(p.id);return true;}).map((p,index)=>({...p,seat:index,ready:p.kind==='bot'?true:!!p.ready})); }); if(m.session.status==='playing' && lanRoom) onStart(m.session.players, m.session.boardId ?? boardId, lanRoom, lanClient); } if(m.type==='chat'){ if(lanRoom && m.player===lanClient.clientId) return; const sender=players.find(p=>p.id===m.player)?.name??m.player; const item:ChatMessage={id:`${m.ts}-${m.player}-${Math.random().toString(36).slice(2,7)}`,player:sender,text:m.text,ts:m.ts}; setChatMessages(prev=>[...prev,item].slice(-300)); if(!chatOpen){setUnreadMessages(prev=>prev+1);setMessagePreview(item);window.setTimeout(()=>setMessagePreview(prev=>prev?.id===item.id?null:prev),3200);} } if(m.type==='emote'){if(lanRoom&&m.player===lanClient.clientId)return;const sender=players.find(p=>p.id===m.player)?.name??m.player;const item:ChatMessage={id:`${m.ts}-${m.player}-${Math.random().toString(36).slice(2,7)}`,player:sender,text:m.emoji,ts:m.ts};setChatMessages(prev=>[...prev,item].slice(-300));if(!chatOpen){setUnreadMessages(prev=>prev+1);setMessagePreview(item);window.setTimeout(()=>setMessagePreview(prev=>prev?.id===item.id?null:prev),3200);}} }), [lanClient, onStart, onSwitchGame, boardId, lanRoom, players, chatOpen, game.id]);

  const publicProfileFor = (profile: ReturnType<typeof getActiveProfile>) => ({
    title: getActiveTitle(profile).name,
    matchesPlayed: profile.matchesPlayed,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    totalXp: profile.totalXp,
    bestWinStreak: profile.bestWinStreak,
    unlockedAchievements: profile.unlockedAchievements.map(item => item.id).slice(0, 250),
  });

  const sendChat = (text:string) => { const playerId=lanRoom ? lanClient.clientId : (players.find(p=>p.kind==='human')?.id??'local-player'); const local=players.find(p=>p.id===playerId)??players.find(p=>p.kind==='human'); const ts=Date.now(); setChatMessages(prev=>[...prev,{id:`${ts}-${Math.random().toString(36).slice(2,7)}`,player:local?.name??'You',text:text.slice(0,200),ts}].slice(-300)); if(lanRoom) lanClient.send({type:'chat',player:playerId,text:text.slice(0,200),ts}); };

  const addBot = () => {
    if (players.length >= game.maxPlayers) return;
    play('button-tap', 0.3);
    const seat = players.length;
    setPlayers([
      ...players,
      {
        id: `bot${seat}`,
        name: ['Hye','Sent','Hyesent'][seat-1] ?? `Player ${seat+1}`,
        kind: 'bot',
        seat,
        connected: true,
        difficulty: 'medium',
        personality: 'friendly',
      },
    ]);
  };

  const setDifficulty = (seat: number, difficulty: BotDifficulty) => {
    play('button-tap', 0.3);
    setPlayers(players.map((p) => (p.seat === seat ? { ...p, difficulty } : p)));
  };

  const removeSeat = (seat: number) => {
    play('button-tap', 0.3);
    setPlayers(players.filter((p) => p.seat !== seat).map((p, i) => ({ ...p, seat: i })));
  };

  const canStart = players.length >= game.minPlayers;
  const canAdd = players.length < game.maxPlayers && (!lanRoom || lanHost);

  return (
    <div style={styles.root}>
      <div style={styles.lobbyChatPill} role="group" aria-label="Lobby chat"><button type="button" style={styles.lobbyChatIcon} onClick={()=>{setChatOpen(true);setUnreadMessages(0);setMessagePreview(null);}} aria-label={unreadMessages?`Open lobby chat, ${unreadMessages} unread messages`:'Open lobby chat'}><Icon name="chat" size={17} color={tokens.text.primary}/>{unreadMessages>0&&<span style={styles.unreadBadge}>{unreadMessages>99?'99+':unreadMessages}</span>}</button></div>
      {messagePreview&&!chatOpen&&<button type="button" style={styles.lobbyPreview} onClick={()=>{setChatOpen(true);setUnreadMessages(0);setMessagePreview(null);}}><strong>{messagePreview.player}</strong><span>{messagePreview.text}</span></button>}
      <header style={styles.header}>
        <button style={styles.iconBtn} onClick={() => { if (lanRoom) lanClient.close(); onBack(); }} aria-label="Back">
          <Icon name="arrow-left" size={18} color={tokens.text.primary} />
        </button>
        <div style={styles.headerText}>
          <h1 style={styles.title}>{game.name}</h1>
          <p style={styles.subtitle}>{game.minPlayers === game.maxPlayers ? `${game.minPlayers} players` : `${game.minPlayers}–${game.maxPlayers} players`}</p>
          <p style={styles.gameAbout}>{GAME_DESCRIPTIONS[game.id]?.about ?? 'Choose your players and get ready to play.'}</p>
        </div>
      </header>

      <section style={styles.guideCard}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', color: tokens.text.primary }}>New to {game.name}?</strong>
          <span style={{ display: 'block', color: tokens.text.muted, fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>Learn the objective, turn sequence, key rules, and how to win before starting.</span>
        </div>
        <button type="button" style={styles.guideBtn} onClick={() => { play('button-tap', 0.3); setGuideOpen(true); }}>How to play</button>
      </section>

      {game.boards && game.boards.length > 0 && (
        <section style={styles.section}>
          <p style={styles.sectionLabel}>{game.id === 'pirate-go' ? 'Game mode' : 'Board'}</p>
          <div style={styles.chips}>
            {game.boards.map((b) => (
              <button
                key={b.id}
                style={{
                  ...styles.chip,
                  ...(boardId === b.id ? styles.chipActive : {}),
                }}
                onClick={() => {
                  play('button-tap', 0.3);
                  setBoardId(b.id);
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={styles.section}>
        <p style={styles.sectionLabel}>Players</p>
        <div style={styles.seats}>
          {players.map((p) => {
            const color = SEAT_COLORS[p.seat % SEAT_COLORS.length];
            return (
              <div key={p.seat} style={styles.seat}>
                <span
                  style={{
                    ...styles.seatDot,
                    background: color,
                    boxShadow: `0 0 12px ${color}88`,
                  }}
                />
                {p.kind === 'bot' ? <span style={styles.seatName}>{p.name}<small style={{display:'block',fontSize:10,color:tokens.text.muted,fontWeight:500}}>Bot · {p.difficulty ?? 'medium'}</small></span> : <button type="button" style={styles.seatNameButton} onClick={() => setProfilePlayer(p)} aria-label={`View ${p.name}'s profile`}><span style={styles.seatName}>{p.name}</span><small style={{display:'block',fontSize:10,color:tokens.text.muted}}>View profile</small></button>}
                <span style={styles.seatRight}>
                  {p.kind !== 'bot' && (
                    <span style={{...styles.readyTag,color:p.ready?tokens.accent.jade:tokens.text.muted}}>{p.ready?'Ready':'Not ready'}</span>
                  )}
                  {p.kind === 'bot' && (
                    <>
                    <select
                      style={styles.difficultySelect}
                      value={p.difficulty ?? 'medium'}
                      onChange={(e) =>
                        setDifficulty(p.seat, e.target.value as BotDifficulty)
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <select style={styles.difficultySelect} aria-label={`${p.name} personality`} value={p.personality ?? 'friendly'} onChange={e=>setPlayers(players.map(x=>x.seat===p.seat?{...x,personality:e.target.value as import('../core/types').BotPersonality}:x))}>
                      <option value="friendly">Friendly</option><option value="rival">Rival</option><option value="strategist">Strategist</option><option value="quiet">Quiet</option>
                    </select>
                    </>
                  )}
                  {p.seat !== 0 && (!lanRoom || (lanHost && p.kind === 'bot')) && (
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeSeat(p.seat)}
                      aria-label="Remove"
                    >
                      <Icon name="x" size={14} color={tokens.text.muted} />
                    </button>
                  )}
                </span>
              </div>
            );
          })}

          {canAdd && (
            <div style={styles.addRow}>
              {game.supports.lan && (
                <button
                  style={styles.addBtn}
                  onClick={() => { play('button-tap', 0.3); setLanOpen(true); }}
                >
                  <Icon name="plus" size={16} color={tokens.text.secondary} />
                  <span>LAN</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {!lanRoom && <footer style={styles.footer}>
        <button
          style={{
            ...styles.startBtn,
            opacity: canStart ? 1 : 0.4,
            pointerEvents: canStart ? 'auto' : 'none',
          }}
          onClick={() => {
            play('coin-insert', 0.6);
            onStart(players, boardId, lanRoom ?? undefined, lanRoom ? lanClient : undefined);
          }}
        >
          Start Game
        </button>
      </footer>}
      {game.supports.bots && canAdd && <button type="button" onClick={addBot} aria-label="Add bot player" title="Add bot player" style={styles.botFab}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/><path d="M2 11v5M22 11v5"/></svg></button>}
      {profilePlayer && profilePlayer.kind !== 'bot' && (() => { const profile = loadLibrary().profiles.find(item => item.id === profilePlayer.profileId); const shared = profilePlayer.publicProfile; const title = profile ? getActiveTitle(profile).name : shared?.title; const matches = profile?.matchesPlayed ?? shared?.matchesPlayed; const wins = profile?.wins ?? shared?.wins; const losses = profile?.losses ?? shared?.losses; const draws = profile?.draws ?? shared?.draws; const xp = profile?.totalXp ?? shared?.totalXp; const streak = profile?.bestWinStreak ?? shared?.bestWinStreak; const achievementIds = profile ? profile.unlockedAchievements.map(item=>item.id) : (shared?.unlockedAchievements ?? []); const achievements = achievementIds.map(id=>ACHIEVEMENT_CATALOG.find(item=>item.id===id)).filter((item): item is typeof ACHIEVEMENT_CATALOG[number] => !!item); return <div style={styles.overlay} onClick={() => setProfilePlayer(null)}><section role="dialog" aria-modal="true" aria-label={`${profilePlayer.name} profile`} style={{...styles.profileModal,maxHeight:'min(82vh,720px)',overflowY:'auto'}} onClick={e => e.stopPropagation()}><button style={styles.close} onClick={() => setProfilePlayer(null)} aria-label="Close profile">×</button><div style={styles.profileAvatar}>{profilePlayer.name.slice(0,1).toUpperCase()}</div><h2 style={{margin:'12px 0 4px'}}>{profilePlayer.name}</h2><p style={{margin:'0 0 18px',color:tokens.accent.gold,fontSize:12}}>{title ?? 'Player'}</p><div style={styles.profileStats}><span><b>{matches ?? '—'}</b><small>Matches</small></span><span><b>{wins ?? '—'}</b><small>Wins</small></span><span><b>{matches !== undefined && wins !== undefined ? `${Math.round((matches ? wins/matches : 0)*100)}%` : '—'}</b><small>Win rate</small></span></div><div style={{...styles.profileStats,marginTop:8}}><span><b>{losses ?? '—'}</b><small>Losses</small></span><span><b>{draws ?? '—'}</b><small>Draws</small></span><span><b>{xp ?? '—'}</b><small>XP</small></span></div><p style={{margin:'16px 0 8px',textAlign:'left',fontWeight:800,fontSize:13}}>Achievements · {achievements.length}</p>{achievements.length ? <div style={{display:'grid',gap:7,textAlign:'left'}}>{achievements.slice(0,12).map(item=><div key={item.id} style={{padding:'9px 10px',borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)'}}><strong style={{display:'block',fontSize:12}}>{item.title}</strong><small style={{color:tokens.text.muted,fontSize:11}}>{item.description}</small></div>)}</div> : <p style={{color:tokens.text.muted,fontSize:12,textAlign:'left'}}>No achievements shared yet.</p>}{streak !== undefined && <p style={{fontSize:12,color:tokens.text.secondary,textAlign:'left'}}>Best win streak: <b>{streak}</b></p>}{!profile && !shared && <p style={{color:tokens.text.muted,fontSize:12}}>This player has not shared profile stats.</p>}</section></div>; })()}
      <ChatPanel open={chatOpen} messages={chatMessages} onClose={()=>setChatOpen(false)} onSend={sendChat} onReact={emoji=>{const playerId=lanRoom?lanClient.clientId:(players.find(p=>p.kind==='human')?.id??'local-player');const local=players.find(p=>p.id===playerId)??players.find(p=>p.kind==='human');const ts=Date.now();setChatMessages(prev=>[...prev,{id:`${ts}-${emoji}`,player:local?.name??'You',text:emoji,ts}].slice(-300));if(lanRoom)lanClient.send({type:'emote',player:playerId,emoji,ts});}}/>
      {guideOpen && <GameGuide gameId={game.id} onClose={() => setGuideOpen(false)} />}
      {lanOpen && (
        <div style={styles.overlay}>
          <div style={styles.lanModal}>
            <button style={styles.close} onClick={() => setLanOpen(false)}>×</button>
            <p style={styles.sectionLabel}>LOCAL NETWORK</p>
            <h2 style={{margin:'4px 0 8px'}}>Play on LAN</h2>
            <p style={{color:tokens.text.muted,fontSize:13}}>Connect both phones to the same Wi-Fi or the host phone's hotspot. The host shares a six-character room code; the other phone uses it to find the room.</p>
            {!Capacitor.isNativePlatform() && <input style={styles.lanInput} value={lanUrl} onChange={e=>setLanUrl(e.target.value)} placeholder="http://192.168.1.10:8787" />}
            <input style={styles.lanInput} value={lanName} onChange={e=>setLanName(e.target.value)} placeholder="Your name" maxLength={32} />
            <input style={styles.lanInput} value={lanCode} onChange={e=>setLanCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6))} placeholder="Six-character room code" aria-label="LAN room code" maxLength={6} autoCapitalize="characters" />
            {Capacitor.isNativePlatform() && <p style={{color:tokens.text.muted,fontSize:12,margin:'8px 0 0'}}>Room discovery checks the local network for this code.</p>}
            <div style={styles.lanActions}>
              <button style={styles.lanPrimary} disabled={lanBusy} onClick={async()=>{setLanBusy(true);try{const profile=getActiveProfile();const p:Player={id:'pending',profileId:profile.id,publicProfile:publicProfileFor(profile),name:lanName.trim()||profile.name,kind:'human',seat:0,connected:true,ready:false};const r=await lanClient.createRoom(lanUrl,game.id,p);setLanRoom(r);setLanHost(true);setPlayers([...r.session.players,...players.filter(x=>x.kind==='bot').map((bot,index)=>({...bot,seat:r.session.players.length+index}))]);setLanCode(r.code);}catch(e){alert(e instanceof Error?e.message:'Could not create LAN room')}finally{setLanBusy(false)}}}>Host room</button>
              <button style={styles.lanSecondary} disabled={lanBusy} onClick={async()=>{setLanBusy(true);try{const profile=getActiveProfile();const p:Player={id:'pending',profileId:profile.id,publicProfile:publicProfileFor(profile),name:lanName.trim()||profile.name,kind:'human',seat:1,connected:true,ready:false};const r=await lanClient.joinRoom(lanUrl,game.id,lanCode,p);setLanRoom(r);setLanHost(false);setPlayers(r.session.players);}catch(e){alert(e instanceof Error?e.message:'Could not join LAN room')}finally{setLanBusy(false)}}}>Join room</button>
            </div>
            {lanRoom && <div style={styles.roomBox}><b>ROOM {lanRoom.code}</b><span>{lanHost?'You are host':'Connected to host'}</span>{lanRoom.baseUrl && <span style={{fontFamily:'monospace',fontSize:11,opacity:.75}}>{lanRoom.baseUrl}</span>}{lanNotice && <span role="status" style={{padding:8,borderRadius:8,background:'rgba(255,92,122,.12)',color:'#ff8aa0'}}>{lanNotice}</span>}{lanHost && <label style={{display:'grid',gap:6,fontSize:12,color:tokens.text.muted}}>Game for this room<select style={styles.lanInput} value={game.id} disabled={lanBusy} onChange={async e=>{const next=e.target.value;if(!next||next===game.id)return;setLanBusy(true);try{await lanClient.switchGame(next);onSwitchGame(next);setBoardId(undefined);setLanNotice('Game changed. Everyone needs to ready up again.');}catch(err){alert(err instanceof Error?err.message:'Could not change LAN game')}finally{setLanBusy(false)}}}>{GAMES.filter(item=>item.supports.lan).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{players.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,fontSize:12}}><span>{p.name} · {p.kind==='bot'?'🤖 bot':p.connected?'online':'offline'}</span><b style={{color:p.kind==='bot'||p.ready?tokens.accent.jade:tokens.text.muted}}>{p.kind==='bot'?'READY':p.ready?'READY':'NOT READY'}</b></div>)}{lanRoom.session.status==='lobby' && <button style={lanHost?styles.lanSecondary:styles.lanPrimary} disabled={lanBusy||lanRoom.session.status!=='lobby'} onClick={async()=>{setLanBusy(true);try{const mine=players.find(p=>p.id===lanClient.clientId);await lanClient.setReady(!(mine?.ready));setLanNotice('');}catch(e){alert(e instanceof Error?e.message:'Could not update readiness')}finally{setLanBusy(false)}}}>{players.find(p=>p.id===lanClient.clientId)?.ready?'Cancel ready':'I am ready'}</button>}{lanHost&&<button style={{...styles.lanPrimary,opacity:players.length>=game.minPlayers&&players.every(p=>p.kind==='bot'||(p.connected&&p.ready))?1:.45}} disabled={lanBusy||players.length<game.minPlayers||!players.every(p=>p.kind==='bot'||(p.connected&&p.ready))} onClick={async()=>{setLanBusy(true);try{await lanClient.start(boardId,players);}catch(e){alert(e instanceof Error?e.message:'Could not start LAN game')}finally{setLanBusy(false)}}}>{lanBusy?'Starting…':'Start LAN game'}</button>}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  lobbyChatPill:{position:'fixed',top:'max(10px,env(safe-area-inset-top))',right:14,zIndex:45,padding:5,borderRadius:999,background:'rgba(26,24,34,.78)',backdropFilter:'blur(22px)',WebkitBackdropFilter:'blur(22px)',border:'1px solid rgba(255,255,255,.16)'},
  lobbyChatIcon:{position:'relative',width:38,height:38,display:'grid',placeItems:'center',border:0,borderRadius:999,background:'transparent'},
  unreadBadge:{position:'absolute',right:0,top:-2,minWidth:16,height:16,padding:'0 3px',boxSizing:'border-box',borderRadius:99,display:'grid',placeItems:'center',fontSize:9,fontWeight:900,background:'#ff5c7a',color:'#fff',border:'1px solid rgba(25,20,30,.9)'},
  lobbyPreview:{position:'fixed',top:'max(56px,calc(env(safe-area-inset-top) + 50px))',right:12,zIndex:44,width:'min(260px,calc(100vw - 24px))',display:'flex',flexDirection:'column',gap:4,padding:'10px 13px',borderRadius:15,textAlign:'left',color:tokens.text.primary,background:'rgba(30,27,40,.92)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.15)',boxShadow:'0 12px 36px #0005'},
  guideCard:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,padding:14,borderRadius:16,background:'linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025))',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.13)'},
  guideBtn:{flexShrink:0,minHeight:44,padding:'10px 14px',border:0,borderRadius:12,background:tokens.accent.gold,color:tokens.text.inverse,fontWeight:800,whiteSpace:'nowrap'},
  overlay:{position:'fixed',inset:0,zIndex:50,background:'#000b',display:'grid',placeItems:'center',padding:20},
  profileModal:{position:'relative',width:'min(380px,100%)',padding:24,boxSizing:'border-box',borderRadius:24,border:'1px solid rgba(255,255,255,.15)',background:'rgba(30,27,40,.94)',backdropFilter:'blur(26px)',textAlign:'center',boxShadow:'0 28px 90px #0008'},
  profileAvatar:{width:58,height:58,margin:'4px auto 0',display:'grid',placeItems:'center',borderRadius:18,background:'rgba(232,185,92,.16)',border:'1px solid rgba(232,185,92,.35)',fontSize:24,fontWeight:800,color:tokens.accent.gold},
  profileStats:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8},
  profileStat:{},
  botFab:{position:'fixed',left:16,bottom:'max(18px,env(safe-area-inset-bottom))',zIndex:45,width:46,height:46,borderRadius:17,display:'grid',placeItems:'center',background:'rgba(38,35,49,.88)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.18)',color:tokens.accent.gold,boxShadow:'0 12px 34px #0005'},
  lanModal:{position:'relative',width:'min(520px,100%)',background:tokens.bg.surface,border:`1px solid ${tokens.bg.border}`,borderRadius:20,padding:24,boxSizing:'border-box'},
  close:{position:'absolute',right:12,top:10,width:34,height:34,border:0,borderRadius:99,background:tokens.bg.raised,color:tokens.text.primary,fontSize:24},
  lanInput:{width:'100%',boxSizing:'border-box',marginTop:10,padding:'12px 14px',borderRadius:10,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.raised,color:tokens.text.primary},
  lanActions:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12},
  lanPrimary:{padding:'12px 14px',border:0,borderRadius:10,background:tokens.accent.gold,color:tokens.text.inverse,fontWeight:700},
  lanSecondary:{padding:'12px 14px',border:`1px solid ${tokens.bg.border}`,borderRadius:10,background:tokens.bg.raised,color:tokens.text.primary},
  roomBox:{display:'flex',flexDirection:'column',gap:8,marginTop:16,padding:14,borderRadius:12,background:tokens.bg.raised},
  root: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.space.lg,
    gap: tokens.space.lg,
    animation: 'hye-rise-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    flexShrink: 0,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    margin: 0,
    fontFamily: tokens.font.display,
    fontSize: tokens.size.xl,
    fontWeight: 700,
  },
  subtitle: { margin: 0, fontSize: tokens.size.sm, color: tokens.text.muted, letterSpacing: 1, textTransform: 'uppercase' },
  gameAbout:{margin:'8px 0 0',maxWidth:540,fontSize:13,lineHeight:1.55,color:tokens.text.secondary,textTransform:'none',letterSpacing:0},
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
  },
  sectionLabel: {
    margin: 0,
    fontSize: 10,
    color: tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  chips: {
    display: 'flex',
    gap: tokens.space.sm,
    flexWrap: 'wrap',
  },
  chip: {
    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    color: tokens.text.secondary,
    fontSize: tokens.size.sm,
  },
  chipActive: {
    background: tokens.accent.gold,
    color: tokens.text.inverse,
    borderColor: tokens.accent.gold,
  },
  seats: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space.sm },
  seat: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.md,
    padding: '9px 12px',
    background: 'linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025))',
    backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: tokens.radius.pill,
    flex: '0 1 auto',
    maxWidth: '100%',
  },
  seatDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
  },
  seatName: {
    flex: 1,
    fontWeight: 500,
    fontSize: tokens.size.md,
  },
  seatNameButton:{flex:1,minWidth:0,padding:0,border:0,background:'transparent',color:tokens.text.primary,textAlign:'left'},
  seatRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  readyTag: {
    fontSize: 10,
    color: tokens.accent.jade,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  difficultySelect: {
    background: tokens.bg.raised,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.sm,
    padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
    color: tokens.text.secondary,
    fontSize: tokens.size.xs,
  },
  removeBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    background: tokens.bg.raised,
  },
  addRow: {
    display: 'flex',
    gap: tokens.space.sm,
  },
  addBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    background: tokens.bg.surface,
    border: `1px dashed ${tokens.bg.border}`,
    borderRadius: tokens.radius.lg,
    color: tokens.text.secondary,
    fontSize: tokens.size.sm,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: tokens.space.lg,
  },
  startBtn: {
    width: '100%',
    padding: tokens.space.lg,
    background: tokens.accent.gold,
    color: tokens.text.inverse,
    fontFamily: tokens.font.display,
    fontWeight: 700,
    fontSize: tokens.size.md,
    letterSpacing: 3,
    textTransform: 'uppercase',
    borderRadius: tokens.radius.md,
    boxShadow: tokens.shadow.glow(tokens.accent.gold),
    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};