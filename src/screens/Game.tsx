import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type {
  GameDefinition,
  GameSession,
  Move,
  Player,
  PlayerId,
} from '../core/types';
import { createSession, dispatch } from '../core/engine';
import { startBotRunner, type BotRunner } from '../core/bots';
import { botComment } from '../core/botSocial';
import { saveSession } from '../core/session';
import { getActiveProfile, recordFinishedMatch, toFinishedMatchInput, type MatchAward } from '../profile/profileStore';
import { WinnerModal } from '../components/WinnerModal';
import { VictoryCelebration } from '../components/VictoryCelebration';
import { Icon } from '../components/Icon';
import { tokens } from '../theme/tokens';
import { ChatPanel, type ChatMessage } from '../components/ChatPanel';
import { GameGuide } from '../games/GameGuide';
import { loadLibrary, getActiveTitle } from '../profile/profileStore';
import { play } from '../theme/sounds';
import type { ScreenProps } from '../core/screen';
import type { LanRoomInfo, LanClient } from '../core/lan';

// ----- Screens (only include ones that actually exist) -----
import { ConnectFourScreen } from '../games/connect-four';
import { SnakeLadderScreen } from '../games/snake-ladder';
import { GameBoardScreen } from './GameBoardScreen';
import { ChessScreen } from '../games/chess/Screen';
import { MonopolyScreen } from '../games/monopoly/Screen';
import { MonopolyDealScreen } from '../games/monopoly-deal/Screen';
import { ScrambleScreen } from '../games/scramble/Screen';
import { TreasureHuntScreen } from '../games/treasure-hunt/Screen';
import { ScrabbleScreen } from '../games/scrabble/Screen';
import { MahjongScreen } from '../games/mahjong/Screen';
import { PirateGoScreen } from '../games/pirate-go/Screen';

import { LudoScreen } from '../games/ludo/Screen';
import { WhotScreen } from '../games/whot/Screen';
import { VitaMahjongScreen } from '../games/vita-mahjong/Screen';
import { DominoesScreen } from '../games/dominoes/Screen';
import { OthelloScreen } from '../games/othello/Screen';
import { BackgammonScreen } from '../games/backgammon/Screen';
import { BattleshipScreen } from '../games/battleship/Screen';
import { Game2048Screen } from '../games/2048/Screen';
import { MinesweeperScreen } from '../games/minesweeper/Screen';
import { SudokuScreen } from '../games/sudoku/Screen';
import { MemoryMatchScreen } from '../games/memory-match/Screen';
import { HeartsScreen } from '../games/hearts/Screen';
import { HangmanScreen } from '../games/hangman/Screen';

type ScreenComponent = (props: ScreenProps<unknown>) => ReactElement;

const SCREENS: Record<string, ScreenComponent> = {
  'connect-four': ConnectFourScreen as unknown as ScreenComponent,
  'snake-ladder': SnakeLadderScreen as unknown as ScreenComponent,
  'tic-tac-toe': GameBoardScreen as unknown as ScreenComponent,
  'gomoku': GameBoardScreen as unknown as ScreenComponent,
  'checkers': GameBoardScreen as unknown as ScreenComponent,
  'drafts': GameBoardScreen as unknown as ScreenComponent,
  'crazy-eights': GameBoardScreen as unknown as ScreenComponent,
  'uno': GameBoardScreen as unknown as ScreenComponent,
  'solitaire': GameBoardScreen as unknown as ScreenComponent,
  'mahjong-solitaire': GameBoardScreen as unknown as ScreenComponent,
  'chess': ChessScreen as unknown as ScreenComponent,
  'ludo': LudoScreen as unknown as ScreenComponent,
  'whot': WhotScreen as unknown as ScreenComponent,
  'monopoly': MonopolyScreen as unknown as ScreenComponent,
  'monopoly-deal': MonopolyDealScreen as unknown as ScreenComponent,
  'scramble': ScrambleScreen as unknown as ScreenComponent,
  'treasure-hunt': TreasureHuntScreen as unknown as ScreenComponent,
  'scrabble': ScrabbleScreen as unknown as ScreenComponent,
  'mahjong': MahjongScreen as unknown as ScreenComponent,
  'vita-mahjong': VitaMahjongScreen as unknown as ScreenComponent,
  'ayo': GameBoardScreen as unknown as ScreenComponent,
  'pirate-go': PirateGoScreen as unknown as ScreenComponent,
  'dominoes': DominoesScreen as unknown as ScreenComponent,
  'othello': OthelloScreen as unknown as ScreenComponent,
  'backgammon': BackgammonScreen as unknown as ScreenComponent,
  'battleship': BattleshipScreen as unknown as ScreenComponent,
  '2048': Game2048Screen as unknown as ScreenComponent,
  'minesweeper': MinesweeperScreen as unknown as ScreenComponent,
  'sudoku': SudokuScreen as unknown as ScreenComponent,
  'memory-match': MemoryMatchScreen as unknown as ScreenComponent,
  'hearts': HeartsScreen as unknown as ScreenComponent,
  'hangman': HangmanScreen as unknown as ScreenComponent,
};

interface GameProps {
  game: GameDefinition<unknown, unknown>;
  players: Player[];
  boardId?: string;
  lanRoom?: LanRoomInfo;
  lanClient?: LanClient;
  onExit: () => void;
}

function buildPlayerViews(game: GameDefinition<unknown, unknown>, session: GameSession<unknown>, hostPlayerId?: string): Record<string, GameSession<unknown>> {
  if (!game.view) return {};
  const views: Record<string, GameSession<unknown>> = {};
  for (const player of session.players) {
    if (player.id === hostPlayerId) { views[player.id] = session; continue; }
    try {
      const state = game.view(session.state, player.id);
      const initialState = session.initialState === undefined ? undefined : game.view(session.initialState, player.id);
      // Hidden-information game histories may contain card/tile identities. Do not
      // broadcast the authoritative audit log to clients that should not see it.
      const safeHistory = session.history.map((move) => ({
        type: move.type, player: move.player, ts: move.ts, payload: {},
        summary: publicHistorySummary(game.id, move, session.players),
      }));
      views[player.id] = { ...session, state, initialState, history: safeHistory };
    } catch { /* a bad projection must not prevent the host from saving the session */ }
  }
  return views;
}

function withAuthoritativeRandomness(game: GameDefinition<unknown, unknown>, move: Move, remoteRequest = false): Move {
  if (!remoteRequest || move.type !== 'roll') return move;
  if (game.id === 'snake-ladder') {
    return { ...move, payload: { ...(move.payload as Record<string, unknown>), value: 1 + Math.floor(Math.random() * 6) }, ts: Date.now() };
  }
  if (game.id === 'ludo') {
    const die1 = 1 + Math.floor(Math.random() * 6);
    const die2 = 1 + Math.floor(Math.random() * 6);
    return { ...move, payload: { ...(move.payload as Record<string, unknown>), die1, die2, value: die1 + die2, doubles: die1 === die2 }, ts: Date.now() };
  }
  return move;
}

export function Game({ game, players, boardId, lanRoom, lanClient, onExit }: GameProps) {
  const [session, setSession] = useState<GameSession<unknown>>(() => createSession(game, players, boardId));
  const [feedback, setFeedback] = useState<{ title: string; message: string; id: number } | null>(null);
  const [matchAward, setMatchAward] = useState<MatchAward | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messagePreview, setMessagePreview] = useState<ChatMessage | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<'estate' | 'finances' | 'actions'>('estate');
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => { const handler = (event: Event) => { if ((event as CustomEvent<string>).detail === game.id) setGuideOpen(true); }; window.addEventListener('hye-open-guide', handler); return () => window.removeEventListener('hye-open-guide', handler); }, [game.id]);
  const [profileTarget, setProfileTarget] = useState<Player | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = (message: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ title: game.name.toUpperCase(), message, id: Date.now() });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3200);
  };
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const publishSession = (next: GameSession<unknown>) => lanClient?.pushSession(next, buildPlayerViews(game, next, lanClient?.clientId));

  const botRunnerRef = useRef<BotRunner | null>(null);
  const pushedInitialRef = useRef(false);
  const recordedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lanClient) return;
    const off = lanClient.onMessage((msg) => {
      if (msg.type === 'session') { sessionRef.current = msg.session as GameSession<unknown>; setSession(msg.session as GameSession<unknown>); }
      if (msg.type === 'chat') {
        if (lanClient && msg.player === lanClient.clientId) return;
        const sender = players.find(p => p.id === msg.player)?.name ?? msg.player;
        const item: ChatMessage = { id: `${msg.ts}-${msg.player}-${Math.random().toString(36).slice(2,7)}`, player: sender, text: msg.text, ts: msg.ts };
        setChatMessages(prev => [...prev, item].slice(-300));
        if (!chatOpen) { setUnreadMessages(prev => prev + 1); setMessagePreview(item); window.setTimeout(() => setMessagePreview(prev => prev?.id === item.id ? null : prev), 3200); }
      }
      if (msg.type === 'emote') {
        if (msg.player === lanClient.clientId) return;
        const sender = players.find(p => p.id === msg.player)?.name ?? msg.player;
        const item: ChatMessage = { id: `${msg.ts}-${msg.player}-${Math.random().toString(36).slice(2,7)}`, player: sender, text: msg.emoji, ts: msg.ts };
        setChatMessages(prev => [...prev, item].slice(-300));
        if (!chatOpen) { setUnreadMessages(prev => prev + 1); setMessagePreview(item); window.setTimeout(() => setMessagePreview(prev => prev?.id === item.id ? null : prev), 3200); }
      }
      if (msg.type === 'transport.error') showFeedback(`LAN message failed: ${msg.message}`);
      if (msg.type === 'move.rejected' && msg.player === lanClient.clientId) showFeedback(msg.message);
      if (msg.type === 'move' && lanClient.isHost()) {
        try {
          const acceptedMove = withAuthoritativeRandomness(game, msg.move, true);
          const next = dispatch(game, sessionRef.current, acceptedMove);
          sessionRef.current = next; setSession(next);
          void lanClient.acceptMove(acceptedMove).then(() => publishSession(next)).catch(error => showFeedback(`LAN sync failed: ${error instanceof Error ? error.message : 'connection lost'}`));
        } catch (error) { const reason = feedbackForGame(game.id, error); play('error', 0.4); showFeedback(reason); lanClient.send({ type: 'move.rejected', player: msg.move.player, message: reason }); }
      }
    });
    if (lanRoom?.session.status === 'playing' && lanRoom.session.state) setSession(lanRoom.session as GameSession<unknown>);
    return () => { off(); };
  }, [lanClient, lanRoom, chatOpen, players]);

  useEffect(() => () => {
    lanClient?.close();
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, [lanClient]);

  useEffect(() => {
    if (lanClient && lanRoom?.host && !pushedInitialRef.current && session.state) {
      pushedInitialRef.current = true;
      void publishSession(session);
    }
  }, [lanClient, lanRoom, session]);

  useEffect(() => {
    if (!game.supports.bots || !game.bot || (lanClient && !lanClient.isHost())) return;
    botRunnerRef.current = startBotRunner(
      game,
      () => sessionRef.current,
      (s) => { sessionRef.current = s; setSession(s); },
      (move) => {
        const bot = sessionRef.current.players.find(p => p.id === move.player);
        const sync = lanClient?.isHost()
          ? lanClient.acceptMove(move).then(() => publishSession(sessionRef.current))
          : Promise.resolve();
        if (bot && sessionRef.current.history.length % 3 === 0) {
          const text = botComment(bot, move);
          if (text) {
            const item: ChatMessage = { id: `${Date.now()}-${bot.id}`, player: bot.name, text, ts: Date.now() };
            if (!lanClient) setChatMessages(prev => [...prev, item].slice(-300));
            if (lanClient?.isHost()) lanClient.send({ type: 'chat', player: bot.id, text, ts: item.ts });
          }
        }
        void sync.catch(error => showFeedback(`LAN sync failed: ${error instanceof Error ? error.message : 'connection lost'}`));
      },
    );
    return () => botRunnerRef.current?.stop();
  }, [game, lanClient, lanRoom?.host]);

  useEffect(() => {
    saveSession(session);
    if (session.status !== 'finished' || !session.result) return;
    const activeProfile = getActiveProfile();
    const localPlayer = session.players.find((player) => player.profileId === activeProfile.id);
    if (!session.result.winner) play('turn-wait', 0.55);
    else if (localPlayer && localPlayer.id === session.result.winner) play('victory', 0.8);
    else if (localPlayer) play('defeat', 0.7);
    else play(session.result.winner ? 'win' : 'lose', 0.7);
    if (recordedSessionRef.current === session.id) return;
    recordedSessionRef.current = session.id;
    if (!localPlayer) return;
    const input = toFinishedMatchInput({ session, gameName: game.name, playerId: localPlayer.id });
    if (!input) return;
    const award = recordFinishedMatch(input);
    if (award) setMatchAward(award);
  }, [session, game.name]);

  const currentId: PlayerId | null =
    session.status === 'playing' ? game.currentPlayer(session.state) : null;

  const currentPlayer = useMemo(
    () => session.players.find((p) => p.id === currentId),
    [session.players, currentId],
  );

  const isMyTurn = lanClient ? currentId === lanClient.clientId : currentPlayer?.kind === 'human';

  const handleMove = (move: Move) => {
    if (lanClient && !lanClient.isHost()) {
      lanClient.send({ type: 'move', move });
      return;
    }
    try {
      const acceptedMove = withAuthoritativeRandomness(game, move, false);
      const next = dispatch(game, session, acceptedMove);
      sessionRef.current = next; setSession(next);
      if (lanClient && lanClient.isHost()) void lanClient.acceptMove(acceptedMove).then(() => publishSession(next)).catch(error => showFeedback(`LAN sync failed: ${error instanceof Error ? error.message : 'connection lost'}`));
    } catch (error) {
      play('error', 0.4);
      showFeedback(feedbackForGame(game.id, error));
    }
  };

  const sendChat = (text: string) => {
    const playerId = lanClient?.clientId ?? (players.find(p => p.kind === 'human')?.id ?? 'local-player');
    const local = players.find(p => p.id === playerId) ?? players.find(p => p.kind === 'human');
    const message: ChatMessage = { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, player: local?.name ?? 'You', text: text.slice(0,200), ts: Date.now() };
    setChatMessages(prev => [...prev, message].slice(-300));
    if (lanClient) lanClient.send({ type: 'chat', player: playerId, text: text.slice(0, 200), ts: message.ts });
  };

  const handleReset = () => {
    play('button-tap', 0.3);
    const next = createSession(game, players, boardId);
    setMatchAward(null);
    setSession(next);
    if (lanClient && lanRoom?.host) void lanClient.pushSession(next);
  };

  const accent = tokens.game[game.id] ?? game.color;
  const Screen = SCREENS[game.id];

  if (!Screen) {
    return (
      <FallbackScreen game={game} onExit={onExit} onReset={handleReset} />
    );
  }

  const activeProfileId = getActiveProfile().id;
  const localPlayerForCelebration = session.players.find((player) => player.profileId === activeProfileId);
  const celebrateWinner = session.status === 'finished' && !!session.result?.winner && session.result.winner === localPlayerForCelebration?.id;

  return (
    <>
      {celebrateWinner && <VictoryCelebration key={session.id} />}
      <Screen
        game={game}
        session={session}
        currentId={currentId}
        currentPlayer={currentPlayer}
        isMyTurn={isMyTurn}
        onMove={handleMove}
        onReset={handleReset}
        onExit={onExit}
        accent={accent}
        lanClient={lanClient}
        lanRoom={lanRoom}
        onOpenPlayerProfile={(player) => { if (player.kind !== 'bot') setProfileTarget(player); }}
      />
      <div className="hye-game-action-pill" style={uiStyles.actionPill} role="group" aria-label="Game tools">
        <button type="button" style={uiStyles.actionIcon} onClick={() => { setChatOpen(true); setUnreadMessages(0); setMessagePreview(null); }} aria-label={unreadMessages ? `Open chat, ${unreadMessages} unread messages` : 'Open chat'}><Icon name="chat" size={17} color={tokens.text.primary}/>{unreadMessages > 0 && <span style={uiStyles.unreadBadge}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>}</button>
        <button type="button" style={uiStyles.actionIcon} onClick={() => setHistoryOpen(true)} aria-label="Open match history"><Icon name="history" size={18} color={tokens.text.primary}/></button>
        <button type="button" style={uiStyles.actionIcon} onClick={() => setMenuOpen(true)} aria-label="Open game menu"><Icon name="more" size={19} color={tokens.text.primary}/></button>
      </div>
      {messagePreview && !chatOpen && <button type="button" style={uiStyles.messagePreview} onClick={() => { setChatOpen(true); setUnreadMessages(0); setMessagePreview(null); }}><strong>{messagePreview.player}</strong><span>{messagePreview.text}</span></button>}
      <ChatPanel open={chatOpen} messages={chatMessages} onClose={() => setChatOpen(false)} onSend={sendChat} onReact={emoji => { const playerId=lanClient?.clientId ?? (players.find(p=>p.kind==='human')?.id ?? 'local-player'); const local=players.find(p=>p.id===playerId) ?? players.find(p=>p.kind==='human'); const ts=Date.now(); const item:ChatMessage={id:`${ts}-${emoji}`,player:local?.name??'You',text:emoji,ts}; setChatMessages(prev=>[...prev,item].slice(-300)); if(lanClient) lanClient.send({type:'emote',player:playerId,emoji,ts}); }} />
      {historyOpen && <div role="presentation" style={uiStyles.overlay} onClick={() => setHistoryOpen(false)}><section role="dialog" aria-modal="true" aria-label="Match history" style={uiStyles.panel} onClick={e => e.stopPropagation()}><header style={uiStyles.panelHeader}><div style={{display:'flex',flexDirection:'column',gap:4}}><strong>Match history</strong><small>{session.history.length} recorded actions · {session.status === 'finished' ? 'Match complete' : 'Live timeline'}</small></div><button type="button" style={uiStyles.close} onClick={() => setHistoryOpen(false)}>Close</button></header><div style={uiStyles.historyList}>{session.history.length ? session.history.map((move, index) => { const actor = session.players.find(p => p.id === move.player)?.name ?? move.player; const description = describeHistoryMove(game.id, move, session.players); return <article key={`${move.ts}-${index}`} style={uiStyles.historyItem}><span style={uiStyles.historyNumber}>{index + 1}</span><div><strong>{actor}</strong><p>{description}</p><small>{new Date(move.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small></div></article>; }) : <p style={{padding:18,color:tokens.text.secondary}}>Actions will appear here as the match progresses. This timeline is saved with the match and can support replay and statistics.</p>}</div></section></div>}
      {menuOpen && <div role="presentation" style={uiStyles.overlay} onClick={() => setMenuOpen(false)}><section role="dialog" aria-modal="true" aria-label="Game menu" style={uiStyles.panel} onClick={e => e.stopPropagation()}><header style={uiStyles.panelHeader}><div style={{display:'flex',flexDirection:'column',gap:4}}><strong>{game.name}</strong><small>Game tools and match information</small></div><button type="button" style={uiStyles.close} onClick={() => setMenuOpen(false)}>Close</button></header>{game.id === 'monopoly' ? <MonopolyMenu state={session.state as Record<string, unknown>} players={session.players} currentId={currentId} tab={menuTab} setTab={setMenuTab} openActions={() => { setMenuOpen(false); window.dispatchEvent(new Event('hye:open-monopoly-actions')); }}/> : <div style={uiStyles.menuButtons}><button style={uiStyles.menuButton} onClick={() => {setMenuOpen(false);setGuideOpen(true);}}>How to play</button><button style={uiStyles.menuButton} onClick={() => {setMenuOpen(false);setHistoryOpen(true);}}>Match history</button><button style={uiStyles.menuButton} onClick={() => {setMenuOpen(false);setChatOpen(true);setUnreadMessages(0);}}>Game chat</button><button style={uiStyles.menuButton} onClick={() => {setMenuOpen(false);handleReset();}}>Restart match</button><button style={uiStyles.menuButton} onClick={() => {setMenuOpen(false);onExit();}}>Leave game</button></div>}</section></div>}
      {guideOpen && <GameGuide gameId={game.id} onClose={() => setGuideOpen(false)} />}
      {profileTarget && profileTarget.kind !== 'bot' && (() => { const profile = loadLibrary().profiles.find(p => p.id === profileTarget.profileId); const title = profile ? getActiveTitle(profile) : null; return <div role="presentation" style={uiStyles.overlay} onClick={() => setProfileTarget(null)}><section role="dialog" aria-modal="true" aria-label={`${profileTarget.name} profile`} style={uiStyles.profilePanel} onClick={e => e.stopPropagation()}><button type="button" style={uiStyles.closeFloating} onClick={() => setProfileTarget(null)}>×</button><div style={uiStyles.avatar}>{profileTarget.name.slice(0,1).toUpperCase()}</div><h2>{profileTarget.name}</h2><p>{title?.name ?? (profileTarget.kind === 'remote' ? 'Local network player' : 'Player')}</p><div style={uiStyles.profileStats}><span><b>{profile?.matchesPlayed ?? '—'}</b><small>Matches</small></span><span><b>{profile?.wins ?? '—'}</b><small>Wins</small></span><span><b>{profile?.totalXp?.toLocaleString() ?? '—'}</b><small>XP</small></span></div>{!profile && <small>Full profile stats are only available for profiles stored on this device.</small>}</section></div>; })()}
      {feedback && <div key={feedback.id} role="status" aria-live="polite" style={feedbackStyles.toast}><strong>{feedback.title}</strong><span>{feedback.message}</span></div>}
      <WinnerModal
        open={session.status === 'finished'}
        session={session}
        profileAward={matchAward}
        onPlayAgain={handleReset}
        onExit={onExit}
      />
    </>
  );
}


function feedbackForGame(id: string, error?: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : '';
  if (detail.includes('not') && detail.includes('turn')) return 'It is not your turn yet. Watch the turn indicator and try again when play returns to you.';
  if (detail.includes('illegal move')) {
    const messages: Record<string, string> = {
      'whot': 'That card cannot be played now. Match the top card by shape or number, follow the called shape, or counter the market penalty.',
      'uno': 'That card does not fit the current colour or action. Choose a legal card, or draw if the rules allow it.',
      'crazy-eights': 'That card does not match the active suit or rank. Play a match or use an eight if your hand allows it.',
      'checkers': 'That move breaks the draughts rules. Follow a highlighted legal move; captures are compulsory when available.',
      'drafts': 'That move is not legal in this draughts position. Captures are compulsory, and a multi-capture must continue.',
      'scrabble': 'That word placement is not legal. Check the spelling, board connection, tile positions, and every crossing word.',
      'scramble': 'That answer was not accepted. Check the available letters and make sure the word has not already been submitted.',
      'pirate-go': 'That intersection is not legal. Check whether it is occupied, removes your own group without capture, or repeats a prohibited position.',
      'chess': 'That move leaves your king unsafe or breaks a piece movement rule. Choose another legal move.',
      'mahjong': 'That action does not fit the current Mahjong phase. Check the tiles needed for this claim or discard.',
      'mahjong-solitaire': 'Those tiles cannot be matched yet. Both must be identical and free from cover, with an open side.',
      'vita-mahjong': 'That tile is blocked or cannot make a valid tray match. Clear a covering tile or choose a compatible tile.',
      'ayo': 'That pit cannot be played in this turn. Choose a non-empty pit on your own row and follow the feeding rule.',
      'ludo': 'That pawn cannot make this move. Check the entry roll, safe spaces, and the highlighted route.',
      'monopoly': 'That transaction is not available right now. Check your cash, property ownership, and the current action phase.',
      'monopoly-deal': 'That card action is not valid in the current state. Check the card text, target, and required payment.',
      'connect-four': 'That column is full. Choose another column with an open slot.',
      'tic-tac-toe': 'That square is already occupied. Choose an empty square.',
      'gomoku': 'That intersection is occupied. Choose an empty point on the board.',
      'treasure-hunt': 'That exploration action is unavailable. Choose an unrevealed legal location or available action.',
    };
    return messages[id] ?? 'That move does not fit this game’s current rules. Check the highlighted options and try another move.';
  }
  return 'That action could not be completed in the current game state. Check the available actions and try again.';
}


function publicHistorySummary(gameId: string, move: Move, players: Player[]): string {
  const payload = move.payload && typeof move.payload === 'object' ? move.payload as Record<string, unknown> : {};
  if (gameId === 'scramble') return 'Submitted an answer';
  if (gameId === 'treasure-hunt') return `Searched ${String.fromCharCode(65 + Number(payload.col ?? 0))}${Number(payload.row ?? 0) + 1}`;
  if (gameId === 'mahjong') {
    const action = String(payload.action ?? move.type).toLowerCase();
    if (action.includes('discard')) return 'Discarded a tile';
    if (action.includes('draw')) return 'Drew a tile';
    if (action.includes('claim') || action.includes('meld')) return 'Claimed a tile set';
    return 'Completed a Mahjong action';
  }
  if (['uno', 'whot', 'crazy-eights', 'monopoly-deal'].includes(gameId)) {
    const action = String(payload.action ?? move.type).toLowerCase();
    if (action.includes('draw') || action.includes('pick')) return 'Drew a card';
    if (action.includes('pass')) return 'Passed';
    if (action.includes('play') || action.includes('card')) return 'Played a card';
  }
  return describeHistoryMove(gameId, move, players);
}

function describeHistoryMove(gameId: string, move: Move, players: Player[]): string {
  const payload = move.payload && typeof move.payload === 'object' ? move.payload as Record<string, unknown> : {};
  if (move.summary) {
    let text = move.summary;
    for (const player of players) text = text.replaceAll(player.id, player.name);
    return text;
  }
  const action = String(payload.action ?? move.type).replaceAll('_', ' ');
  const die = [payload.die1, payload.die2].every(value => Number.isFinite(Number(value))) ? `${payload.die1} + ${payload.die2}` : null;
  if (gameId === 'ludo' && move.type === 'roll') return die ? `Rolled ${die} (${Number(payload.value) || Number(payload.die1) + Number(payload.die2)} spaces)` : `Rolled ${payload.value ?? 'the dice'}`;
  if (gameId === 'snake-ladder' && move.type === 'roll') return `Rolled ${payload.value ?? 'the die'}`;
  if (gameId === 'monopoly' && action === 'roll') return die ? `Rolled ${die}` : 'Rolled two dice';
  if (gameId === 'monopoly' && action === 'buy') return `Bought ${String(payload.propertyId ?? 'property').replaceAll('-', ' ')}${payload.amount ? ` for $${payload.amount}` : ''}`;
  if (gameId === 'scrabble' && payload.word) return `Played “${String(payload.word).toUpperCase()}”`;
  if (gameId === 'pirate-go') {
    if (action === 'place') return `Placed a stone at row ${Math.floor(Number(payload.index) / 9) + 1}, column ${Number(payload.index) % 9 + 1}`;
    if (action === 'pass') return 'Passed the turn';
    if (action === 'set-mode') return `Selected ${payload.mode === 'go' ? 'Traditional Go' : 'Classic Pirate'} rules`;
    if (action === 'toggle-dead') return `Marked or restored a stone group for scoring`;
    if (action === 'confirm-score') return 'Confirmed the score';
  }
  if (gameId === 'checkers' || gameId === 'drafts') {
    const moveData = (payload.move && typeof payload.move === 'object' ? payload.move : payload) as Record<string, unknown>;
    const from = Number(moveData.from), to = Number(moveData.to);
    if (Number.isFinite(from) && Number.isFinite(to)) return `${gameId === 'drafts' ? 'Draughts' : 'Checkers'} move ${from + 1} → ${to + 1}${moveData.captured ? ` · captured ${String(moveData.captured)}` : ''}`;
  }
  if (gameId === 'chess') {
    if (payload.from !== undefined && payload.to !== undefined) return `Moved ${String(payload.piece ?? 'piece')} from ${String(payload.from)} to ${String(payload.to)}`;
  }
  if (gameId === 'connect-four') return `Dropped a piece in column ${Number(payload.column ?? payload.col ?? 0) + 1}`;
  if (gameId === 'tic-tac-toe' || gameId === 'gomoku') return `Placed a mark at ${String(payload.index ?? payload.position ?? 'a board point')}`;
  if (['uno', 'whot', 'crazy-eights', 'monopoly-deal'].includes(gameId)) {
    const card = payload.card ?? payload.cardId ?? payload.cardName;
    if (card) return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${String(card).replaceAll('-', ' ')}`;
  }
  const detail = Object.entries(payload).filter(([key, value]) => !['action'].includes(key) && value !== undefined && value !== null && typeof value !== 'object').map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ');
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}${detail ? ` · ${detail}` : ''}`;
}


function MonopolyMenu({state,players,currentId,tab,setTab,openActions}:{state:Record<string,unknown>;players:Player[];currentId:string|null;tab:'estate'|'finances'|'actions';setTab:(tab:'estate'|'finances'|'actions')=>void;openActions:()=>void}) {
  const properties = Array.isArray(state.properties) ? state.properties as Array<{id:string;name:string;group:string;price:number;rent:number;type:string}> : [];
  const owned = (state.owned ?? {}) as Record<string,string|null>;
  const money = (state.money ?? {}) as Record<string,number>;
  const houses = (state.houses ?? {}) as Record<string,number>;
  const mortgages = (state.mortgages ?? {}) as Record<string,boolean>;
  const me = currentId ?? players[0]?.id ?? '';
  const mine = properties.filter(p => owned[p.id] === me);
  const ownerName = (id:string|null) => players.find(p=>p.id===id)?.name ?? (id ? 'Unknown player' : 'Unowned');
  const rentLabel = (p:typeof properties[number]) => { const owner=owned[p.id]; if(!owner) return p.type==='property'?`$${p.rent} base`:p.type==='railroad'?'$25 base':'4× dice base'; if(mortgages[p.id]) return '$0 · mortgaged'; if(p.type==='railroad') return `$${25*Math.pow(2,Math.max(0,properties.filter(q=>q.type==='railroad'&&owned[q.id]===owner).length-1))}`; if(p.type==='utility') return `${properties.filter(q=>q.type==='utility'&&owned[q.id]===owner).length>=2?'10×':'4×'} dice`; const group=properties.filter(q=>q.type==='property'&&q.group===p.group); const monopoly=group.length>0&&group.every(q=>owned[q.id]===owner); const buildings=houses[p.id]??0; return `$${p.rent*([1,5,15,45,80][Math.min(buildings,5)]??80)*(buildings===0&&monopoly?2:1)}`; };
  const totalAssetValue = mine.reduce((sum,p)=>sum+(p.price||0)+((houses[p.id]??0)*50),0);
  return <div style={{padding:'14px 16px 20px'}}><div style={uiStyles.tabs}>{([['estate','Real estate'],['finances','Finances'],['actions','Actions']] as const).map(([id,label])=><button key={id} style={{...uiStyles.tab,...(tab===id?uiStyles.tabActive:{})}} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='estate' ? <><div style={uiStyles.summaryLine}><b>{mine.length} owned assets</b><span>Unowned {properties.filter(p=>p.price>0&&!owned[p.id]).length}</span></div><div style={uiStyles.estateList}>{properties.filter(p=>p.price>0).map(p=><article key={p.id} style={uiStyles.estateItem}><span style={{...uiStyles.groupMark,background:groupColor(p.group)}}/><div style={{flex:1,minWidth:0}}><strong>{p.name}</strong><small>{p.group} · {ownerName(owned[p.id]??null)}</small><small>Price ${p.price} · Rent {rentLabel(p)}{(houses[p.id]??0)>0?` · ${houses[p.id]>=5?'Hotel':`${houses[p.id]} houses`}`:''}</small></div><span style={{fontSize:11,color:tokens.text.secondary}}>{mortgages[p.id]?'Mortgaged':owned[p.id]===me?'Yours':owned[p.id]?'Owned':'Available'}</span></article>)}</div></> : tab==='finances' ? <><div style={uiStyles.financeGrid}><div style={uiStyles.financeCard}><small>Cash balance</small><strong>${money[me]??0}</strong></div><div style={uiStyles.financeCard}><small>Property value</small><strong>${totalAssetValue.toLocaleString()}</strong></div><div style={uiStyles.financeCard}><small>Debt / deficit</small><strong>${Math.max(0,-(money[me]??0))}</strong></div><div style={uiStyles.financeCard}><small>Mortgaged assets</small><strong>{mine.filter(p=>mortgages[p.id]).length}</strong></div></div><h3 style={{fontSize:14}}>Player balances</h3>{players.map(p=><div key={p.id} style={uiStyles.balanceRow}><span>{p.name}{p.id===me?' · You':''}</span><strong>${money[p.id]??0}</strong></div>)}</> : <div style={uiStyles.menuButtons}><p style={{fontSize:13,color:tokens.text.secondary}}>Turn actions open in a real pop-up, so the board stays clear and easy to use.</p><div style={uiStyles.summaryLine}><span>Current phase</span><b>{String(state.phase??'playing').replaceAll('-',' ')}</b></div><div style={uiStyles.summaryLine}><span>Board</span><b>{String(state.boardId??'Hye City').replaceAll('-',' ')}</b></div><button type="button" style={uiStyles.menuButton} onClick={openActions}>Open turn actions</button></div>}</div>;
}
function groupColor(group:string){const colors:Record<string,string>={Amber:'#b98c52',Azure:'#6095b9',Rose:'#b6788f',Gold:'#c6a65d',Red:'#b96d70',Green:'#78a17b',Navy:'#7884b8',Purple:'#9b81b8',Rail:'#99958d',utility:'#77a6a0',tax:'#a88c78',chance:'#c6aa6d',chest:'#7998b2',corner:'#9a9aa3'};return colors[group]??'#888';}

const uiStyles:Record<string,React.CSSProperties> = {
  actionPill:{position:'fixed',top:'max(10px,env(safe-area-inset-top))',right:12,zIndex:130,display:'flex',alignItems:'center',gap:2,padding:5,borderRadius:999,background:'rgba(26,24,34,.78)',backdropFilter:'blur(22px)',WebkitBackdropFilter:'blur(22px)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 10px 32px #0005'},
  actionIcon:{position:'relative',width:38,height:38,display:'grid',placeItems:'center',border:0,borderRadius:999,background:'transparent',color:tokens.text.primary},
  unreadBadge:{position:'absolute',right:0,top:-2,minWidth:16,height:16,padding:'0 3px',boxSizing:'border-box',borderRadius:99,display:'grid',placeItems:'center',fontSize:9,fontWeight:900,background:'#ff5c7a',color:'#fff',border:'1px solid rgba(25,20,30,.9)'},
  messagePreview:{position:'fixed',top:'max(56px,calc(env(safe-area-inset-top) + 50px))',right:12,zIndex:129,width:'min(260px,calc(100vw - 24px))',display:'flex',flexDirection:'column',gap:4,padding:'10px 13px',borderRadius:15,textAlign:'left',color:tokens.text.primary,background:'rgba(30,27,40,.92)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.15)',boxShadow:'0 12px 36px #0005'},
  overlay:{position:'fixed',inset:0,zIndex:160,display:'flex',alignItems:'center',justifyContent:'center',padding:'max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))',background:'rgba(5,5,10,.72)',backdropFilter:'blur(7px)'},
  panel:{width:'min(620px,100%)',maxHeight:'min(84dvh,850px)',display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:24,border:'1px solid rgba(255,255,255,.16)',background:'rgba(30,27,40,.96)',backdropFilter:'blur(28px)',boxShadow:'0 28px 90px #0008',color:tokens.text.primary},
  panelHeader:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'17px 18px',borderBottom:'1px solid rgba(255,255,255,.1)'},
  close:{padding:'9px 13px',borderRadius:11,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.06)',color:tokens.text.primary},
  historyList:{padding:12,overflowY:'auto',display:'flex',flexDirection:'column',gap:8},
  historyItem:{display:'flex',gap:12,alignItems:'flex-start',padding:12,borderRadius:14,background:'rgba(255,255,255,.045)',border:'1px solid rgba(255,255,255,.075)'},
  historyNumber:{width:28,height:28,flexShrink:0,display:'grid',placeItems:'center',borderRadius:9,background:'rgba(232,185,92,.12)',color:tokens.accent.gold,fontSize:11,fontWeight:800},
  menuButtons:{display:'flex',flexDirection:'column',gap:8,padding:16},
  menuButton:{padding:'13px 14px',borderRadius:13,textAlign:'left',color:tokens.text.primary,background:'rgba(255,255,255,.055)',border:'1px solid rgba(255,255,255,.1)'},
  tabs:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:5,padding:4,borderRadius:14,background:'rgba(255,255,255,.045)'},
  tab:{padding:'10px 7px',border:0,borderRadius:10,background:'transparent',color:tokens.text.secondary,fontSize:12,fontWeight:700},
  tabActive:{background:'rgba(232,185,92,.16)',color:tokens.accent.gold,border:'1px solid rgba(232,185,92,.24)'},
  summaryLine:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'10px 2px',fontSize:12,color:tokens.text.secondary},
  estateList:{display:'flex',flexDirection:'column',gap:7,maxHeight:'54dvh',overflowY:'auto'},
  estateItem:{display:'flex',alignItems:'center',gap:10,padding:11,borderRadius:13,background:'rgba(255,255,255,.045)',border:'1px solid rgba(255,255,255,.08)'},
  groupMark:{width:5,alignSelf:'stretch',minHeight:42,borderRadius:8,flexShrink:0},
  financeGrid:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9,margin:'12px 0'},
  financeCard:{display:'flex',flexDirection:'column',gap:7,padding:14,borderRadius:15,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)'},
  balanceRow:{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)',fontSize:13},
  profilePanel:{position:'relative',width:'min(370px,100%)',padding:24,boxSizing:'border-box',borderRadius:24,border:'1px solid rgba(255,255,255,.16)',background:'rgba(30,27,40,.96)',textAlign:'center',color:tokens.text.primary},
  closeFloating:{position:'absolute',right:12,top:12,width:34,height:34,borderRadius:99,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.06)',color:tokens.text.primary,fontSize:23},
  avatar:{width:58,height:58,margin:'0 auto',display:'grid',placeItems:'center',borderRadius:18,background:'rgba(232,185,92,.16)',color:tokens.accent.gold,fontSize:24,fontWeight:800},
  profileStats:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'18px 0'},
};

const feedbackStyles: Record<string, React.CSSProperties> = {
  toast: { position:'fixed', zIndex:120, left:'50%', bottom:'max(20px, env(safe-area-inset-bottom))', transform:'translateX(-50%)', width:'min(440px, calc(100vw - 28px))', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:5, padding:'13px 16px', borderRadius:15, border:'1px solid #c99b55', background:'rgba(20,18,16,.97)', color:'#fff0d4', boxShadow:'0 14px 42px #0008', fontSize:13, lineHeight:1.45, textAlign:'left' },
};

// ---------------------------------------------------------------
// Fallback when a game has no Screen yet
// ---------------------------------------------------------------

interface FallbackProps {
  game: GameDefinition<unknown, unknown>;
  onExit: () => void;
  onReset: () => void;
}

function FallbackScreen({ game, onExit, onReset }: FallbackProps) {
  return (
    <div style={fallbackStyles.root}>
      <header style={fallbackStyles.header}>
        <button style={fallbackStyles.iconBtn} onClick={onExit} aria-label="Back">
          <Icon name="arrow-left" size={18} color={tokens.text.primary} />
        </button>
        <span style={fallbackStyles.title}>{game.name}</span>
        <button
          style={fallbackStyles.iconBtn}
          onClick={onReset}
          aria-label="Reset"
        >
          <Icon name="rotate" size={18} color={tokens.text.primary} />
        </button>
      </header>
      <main style={fallbackStyles.body}>
        <p style={fallbackStyles.text}>
          {game.name} screen not implemented yet.
        </p>
      </main>
    </div>
  );
}

const fallbackStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.space.md,
    gap: tokens.space.md,
    animation: 'hye-fade-in 240ms ease-out',
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
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: tokens.font.display,
    fontWeight: 700,
    fontSize: tokens.size.md,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: tokens.text.muted,
    fontSize: tokens.size.sm,
  },
};