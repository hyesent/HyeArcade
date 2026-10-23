import { useEffect, useMemo, useState } from 'react';
import { GAMES, getGame } from '../games/registry';
import { tokens } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { listOnlineRooms, ONLINE_API_BASE, type PublicOnlineRoom } from '../core/online';

interface MultiplayerMenuProps {
  onBack: () => void;
  onOnline: () => void;
  onLanGame: (gameId: string) => void;
}

export function MultiplayerMenu({ onBack, onOnline, onLanGame }: MultiplayerMenuProps) {
  const [showLanGames, setShowLanGames] = useState(false);
  const lanGames = GAMES.filter(game => game.supports.lan && game.maxPlayers > 1);
  return <main style={styles.root}>
    <header style={styles.header}><button style={styles.back} onClick={onBack} aria-label="Back"><Icon name="arrow-left" size={18} color={tokens.text.primary}/></button><div><h1 style={styles.title}>Multiplayer</h1><p style={styles.sub}>Play together nearby or over the internet.</p></div></header>
    {!showLanGames ? <div style={styles.choiceGrid}>
      <button style={styles.choiceCard} onClick={onOnline}><span style={styles.choiceIcon}>◎</span><strong>Online</strong><span>Find public rooms, join with a code, and play over the internet.</span><b>Browse online rooms <span>→</span></b></button>
      <button style={styles.choiceCard} onClick={() => setShowLanGames(true)}><span style={styles.choiceIcon}>⌁</span><strong>Local network</strong><span>Play with people connected to the same Wi-Fi or hotspot.</span><b>Choose a LAN game <span>→</span></b></button>
    </div> : <><button style={styles.backTo} onClick={() => setShowLanGames(false)}>← Connection options</button><h2 style={styles.sectionTitle}>Choose a game for LAN</h2><div style={styles.gameGrid}>{lanGames.map(game=><button key={game.id} style={styles.gameCard} onClick={()=>onLanGame(game.id)}><strong>{game.name}</strong><small>{game.minPlayers}–{game.maxPlayers} players</small><span>Host or join →</span></button>)}</div></>}
  </main>;
}

interface OnlineLobbyProps {
  onBack: () => void;
  onCreateRoom: (gameId: string) => void;
  onJoinRoom: (gameId: string, code: string) => void;
}

export function OnlineLobby({ onBack, onCreateRoom, onJoinRoom }: OnlineLobbyProps) {
  const [rooms, setRooms] = useState<PublicOnlineRoom[]>([]);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState<'browse'|'create'|'join'>('browse');
  const [createGame, setCreateGame] = useState('ludo');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warming, setWarming] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);
  const onlineGames = useMemo(() => GAMES.filter(game => game.supports.lan && game.maxPlayers > 1), []);

  const refresh = async (showError = true) => {
    try {
      const next = await listOnlineRooms(filter === 'all' ? undefined : filter);
      setRooms(next);
      setError('');
      setWarming(false);
      setLastUpdated(Date.now());
    } catch (err) {
      if (showError) setError(err instanceof Error ? err.message : 'Could not load online rooms.');
      setWarming(true);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await listOnlineRooms(filter === 'all' ? undefined : filter);
        if (!active) return;
        setRooms(next); setError(''); setWarming(false); setLastUpdated(Date.now());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load online rooms.'); setWarming(true);
      }
    };
    void load();
    const interval = window.setInterval(() => { if (active) void load(); }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [filter]);

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) { setError('Enter the six-character room code.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${ONLINE_API_BASE}/api/rooms/${code}`);
      const data = await response.json().catch(() => ({})) as { gameId?: string; status?: string; detail?: string };
      if (!response.ok || !data.gameId) throw new Error(data.detail || 'Room not found. Check the code and try again.');
      if (data.status !== 'lobby') throw new Error('That match has already started. Ask the host for a waiting room.');
      onJoinRoom(data.gameId, code);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not find that room.'); }
    finally { setBusy(false); }
  };

  return <main style={styles.root}>
    <header style={styles.header}><button style={styles.back} onClick={onBack} aria-label="Back"><Icon name="arrow-left" size={18} color={tokens.text.primary}/></button><div><h1 style={styles.title}>Online lobby</h1><p style={styles.sub}>Find a room or create one for your friends.</p></div><button style={styles.refresh} onClick={()=>void refresh()} disabled={busy} aria-label="Refresh rooms">↻</button></header>
    <div style={styles.onlineHero}><div><span style={styles.onlineEyebrow}>HYE ARCADE ONLINE</span><strong>Rooms around the world</strong><small>{rooms.length} waiting {rooms.length===1?'room':'rooms'} · live refresh</small></div><span style={styles.onlineOrb}>◎</span></div>
    <div style={styles.actionRow}><button style={{...styles.action, ...(mode==='browse'?styles.actionActive:{})}} onClick={()=>{setMode('browse');setError('');}}>Browse rooms</button><button style={{...styles.action, ...(mode==='create'?styles.actionActive:{})}} onClick={()=>{setMode('create');setError('');}}>＋ Create room</button><button style={{...styles.action, ...(mode==='join'?styles.actionActive:{})}} onClick={()=>{setMode('join');setError('');}}>Join by code</button></div>
    {warming && <div role="status" style={styles.wakeNote}>The first request may take up to 50 seconds while the online server wakes up. Keep this screen open while it connects.</div>}
    {error && <div role="alert" style={styles.error}>{error}</div>}
    {mode==='browse' && <>
      <div style={styles.filterRow}><span style={styles.sectionTitle}>Waiting rooms</span><select aria-label="Filter rooms by game" style={styles.select} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All games</option>{onlineGames.map(game=><option key={game.id} value={game.id}>{game.name}</option>)}</select></div>
      {rooms.length ? <div style={styles.roomList}>{rooms.map(room=>{const game=getGame(room.gameId);return <article key={room.code} style={styles.roomCard}><div style={styles.roomGlyph}>{game?.name.slice(0,1)??'H'}</div><div style={styles.roomDetails}><strong>{game?.name??room.gameId}</strong><span>Hosted by {room.hostName}</span><small>{room.players}/{room.maxPlayers} players · Waiting</small></div><button style={styles.joinButton} disabled={busy || !room.hostOnline} onClick={()=>onJoinRoom(room.gameId,room.code)}>{room.hostOnline?'Join':'Offline'}</button></article>})}</div> : <div style={styles.empty}><span>◎</span><strong>No waiting rooms yet</strong><p>Create a room and invite friends, or check back in a moment.</p><button style={styles.primary} onClick={()=>setMode('create')}>Create a room</button></div>}
      {lastUpdated>0&&<p style={styles.updated}>Updated {new Date(lastUpdated).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}
    </>}
    {mode==='create' && <section style={styles.panel}><h2 style={styles.panelTitle}>Create an online room</h2><p style={styles.panelText}>Choose a game. You’ll enter its normal in-game lobby, where you can add bots, chat, wait for guests, and start when everyone is ready.</p><label style={styles.label}>Game<select style={styles.selectFull} value={createGame} onChange={e=>setCreateGame(e.target.value)}>{onlineGames.map(game=><option key={game.id} value={game.id}>{game.name} · {game.minPlayers}–{game.maxPlayers} players</option>)}</select></label><button style={styles.primary} onClick={()=>onCreateRoom(createGame)}>Create room →</button><p style={styles.panelFoot}>A room code will be available to share. Players can also discover waiting rooms in the public browser.</p></section>}
    {mode==='join' && <section style={styles.panel}><h2 style={styles.panelTitle}>Join a private room</h2><p style={styles.panelText}>Enter the six-character code shared by the host.</p><label style={styles.label}>Room code<input style={styles.codeInput} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="ABC123" maxLength={6} autoCapitalize="characters" autoCorrect="off" /></label><button style={styles.primary} disabled={busy||joinCode.length!==6} onClick={()=>void joinByCode()}>{busy?'Connecting…':'Join room →'}</button></section>}
  </main>;
}

const styles: Record<string, React.CSSProperties> = {
  root:{minHeight:'100%',display:'flex',flexDirection:'column',gap:18,padding:`${tokens.space.lg}px ${tokens.space.lg}px ${tokens.space.xl}px`,color:tokens.text.primary,animation:'hye-fade-in 250ms ease-out'},
  header:{display:'flex',alignItems:'center',gap:12}, back:{width:40,height:40,flexShrink:0,borderRadius:14,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,display:'grid',placeItems:'center'}, title:{margin:0,fontSize:25,fontFamily:tokens.font.display,letterSpacing:.2},sub:{margin:'4px 0 0',fontSize:12,color:tokens.text.muted,lineHeight:1.4},
  choiceGrid:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12},choiceCard:{minHeight:215,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:12,padding:16,textAlign:'left',borderRadius:22,border:`1px solid ${tokens.bg.border}`,background:'linear-gradient(145deg,rgba(232,185,92,.12),rgba(255,255,255,.025) 55%)',color:tokens.text.primary},choiceIcon:{width:44,height:44,borderRadius:15,display:'grid',placeItems:'center',fontSize:28,color:tokens.accent.gold,background:'rgba(232,185,92,.12)'},choiceCardStrong:{fontSize:17},choiceCardSpan:{fontSize:12,color:tokens.text.muted,lineHeight:1.5},gameGrid:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10},gameCard:{display:'flex',flexDirection:'column',gap:7,padding:14,textAlign:'left',borderRadius:16,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,color:tokens.text.primary},backTo:{alignSelf:'flex-start',border:0,background:'transparent',color:tokens.text.secondary,padding:'5px 0'},sectionTitle:{fontSize:14,fontWeight:800},
  refresh:{marginLeft:'auto',width:38,height:38,borderRadius:13,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,color:tokens.text.primary,fontSize:24},onlineHero:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:18,borderRadius:22,border:'1px solid rgba(232,185,92,.2)',background:'linear-gradient(125deg,rgba(232,185,92,.14),rgba(79,209,160,.06) 60%,rgba(255,255,255,.02))'},onlineEyebrow:{display:'block',fontSize:9,fontWeight:900,letterSpacing:2,color:tokens.accent.gold,marginBottom:7},onlineOrb:{width:55,height:55,borderRadius:19,display:'grid',placeItems:'center',fontSize:34,color:tokens.accent.gold,background:'rgba(232,185,92,.1)'},actionRow:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7},action:{padding:'10px 5px',borderRadius:12,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,color:tokens.text.secondary,fontSize:11,fontWeight:800},actionActive:{borderColor:'rgba(232,185,92,.55)',background:'rgba(232,185,92,.1)',color:tokens.accent.gold},wakeNote:{padding:'11px 12px',borderRadius:13,background:'rgba(95,168,232,.1)',border:'1px solid rgba(95,168,232,.22)',color:tokens.text.secondary,fontSize:12,lineHeight:1.5},error:{padding:11,borderRadius:12,background:'rgba(255,92,122,.12)',color:'#ff8aa0',fontSize:12},filterRow:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10},select:{maxWidth:'55%',padding:'9px 10px',borderRadius:12,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,color:tokens.text.primary},selectFull:{width:'100%',padding:12,borderRadius:13,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,color:tokens.text.primary,marginTop:7},roomList:{display:'grid',gap:9},roomCard:{display:'flex',alignItems:'center',gap:11,padding:12,borderRadius:17,border:`1px solid ${tokens.bg.border}`,background:'rgba(255,255,255,.025)'},roomGlyph:{width:43,height:43,flexShrink:0,borderRadius:14,display:'grid',placeItems:'center',fontSize:19,fontWeight:900,color:tokens.accent.gold,background:'rgba(232,185,92,.1)'},roomDetails:{display:'flex',flexDirection:'column',gap:4,minWidth:0,flex:1},joinButton:{padding:'10px 13px',border:0,borderRadius:12,background:tokens.accent.jade,color:tokens.text.inverse,fontWeight:900,fontSize:12},empty:{padding:'28px 18px',borderRadius:20,border:`1px dashed ${tokens.bg.border}`,display:'flex',flexDirection:'column',alignItems:'center',gap:9,textAlign:'center'},primary:{padding:'13px 16px',border:0,borderRadius:14,background:tokens.accent.jade,color:tokens.text.inverse,fontWeight:900},updated:{margin:0,textAlign:'right',fontSize:10,color:tokens.text.muted},panel:{padding:17,borderRadius:20,border:`1px solid ${tokens.bg.border}`,background:tokens.bg.surface,display:'flex',flexDirection:'column',gap:14},panelTitle:{margin:0,fontSize:18},panelText:{margin:0,fontSize:12,lineHeight:1.6,color:tokens.text.secondary},label:{display:'flex',flexDirection:'column',gap:6,fontSize:12,color:tokens.text.secondary,fontWeight:700},panelFoot:{margin:0,fontSize:11,lineHeight:1.5,color:tokens.text.muted},codeInput:{padding:14,borderRadius:13,border:`1px solid ${tokens.bg.border}`,background:'rgba(0,0,0,.18)',color:tokens.text.primary,fontSize:20,fontWeight:900,letterSpacing:5,textAlign:'center',textTransform:'uppercase'},
};
