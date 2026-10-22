import type {
  GameDefinition,
  GameSession,
  Move,
  Player,
} from './types';

function structuredCloneSafe<T>(value: T): T {
  try { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T; }
  catch { return value; }
}

function createId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createSession<S, M>(
  def: GameDefinition<S, M>,
  players: Player[],
  boardId?: string,
): GameSession<S> {
  const state = def.setup(players, boardId);

  return {
    id: createId(),
    gameId: def.id,
    boardId,
    players,
    state,
    initialState: structuredCloneSafe(state),
    history: [],
    status: 'playing',
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function dispatch<S, M>(
  def: GameDefinition<S, M>,
  session: GameSession<S>,
  move: Move<M>,
): GameSession<S> {
  if (session.status !== 'playing') {
    throw new Error('Session is not playing');
  }

  const current = def.currentPlayer(session.state);

  if (move.player !== current && !def.allowOutOfTurn?.(session.state, move)) {
    throw new Error(`Not ${move.player}'s turn (current: ${current})`);
  }

  if (!def.validate(session.state, move)) {
    throw new Error(`Illegal move: ${move.type}`);
  }

  const nextState = def.apply(session.state, move);
  const result = def.isOver(nextState);
  const previousLog = Array.isArray((session.state as any)?.log) ? (session.state as any).log as unknown[] : [];
  const nextLog = Array.isArray((nextState as any)?.log) ? (nextState as any).log as unknown[] : [];
  let summary = '';
  if (nextLog.length > previousLog.length) summary = nextLog.slice(previousLog.length).map(String).join(' · ');
  else if (nextLog.length && String(nextLog[nextLog.length - 1]) !== String(previousLog[previousLog.length - 1] ?? '')) summary = String(nextLog[nextLog.length - 1]);
  if (!summary) summary = fallbackMoveSummary(def.id, session.state, nextState, move);
  const enrichedMove = summary ? { ...move, summary } : move;

  return {
    ...session,
    state: nextState,
    history: [...session.history, enrichedMove],
    status: result ? 'finished' : 'playing',
    result,
    updatedAt: Date.now(),
  };
}

function fallbackMoveSummary(gameId: string, before: unknown, after: unknown, move: Move): string {
  const oldState = (before ?? {}) as Record<string, any>;
  const newState = (after ?? {}) as Record<string, any>;
  const payload = (move.payload && typeof move.payload === 'object' ? move.payload : {}) as Record<string, any>;
  const action = String(payload.action ?? move.type).toLowerCase();
  if (gameId === 'ludo') {
    if (move.type === 'roll') return Number.isFinite(payload.die1) && Number.isFinite(payload.die2) ? `Rolled ${payload.die1} + ${payload.die2} = ${payload.value}` : `Rolled ${payload.value ?? 'the dice'}`;
    if (move.type === 'pick') {
      const index = Number(payload.pawnIndex); const oldPawn = oldState.pawns?.[index]; const newPawn = newState.pawns?.[index];
      if (oldPawn && newPawn) {
        const pawn = `${String(oldPawn.color)} pawn ${Number(oldPawn.id) + 1}`;
        if (newPawn.state === 'finished') return `Moved ${pawn} home`;
        if (oldPawn.state === 'yard') return `Brought ${pawn} onto the board`;
        if (newPawn.state === 'home-col') return `Moved ${pawn} into its home lane`;
        return `Moved ${pawn} from step ${Number(oldPawn.step) + 1} to step ${Number(newPawn.step) + 1}`;
      }
    }
  }
  if (gameId === 'snake-ladder' && move.type === 'roll') {
    const oldPlayer = oldState.players?.find((player: any) => player.id === move.player); const newPlayer = newState.players?.find((player: any) => player.id === move.player);
    if (oldPlayer && newPlayer) {
      if (newPlayer.position < oldPlayer.position) return `Rolled ${payload.value}: slid from ${oldPlayer.position || 'start'} to ${newPlayer.position}`;
      if (newPlayer.position > oldPlayer.position + Number(payload.value)) return `Rolled ${payload.value}: climbed from ${oldPlayer.position || 'start'} to ${newPlayer.position}`;
      return `Rolled ${payload.value}: moved from ${oldPlayer.position || 'start'} to ${newPlayer.position}`;
    }
    return `Rolled ${payload.value ?? 'the die'}`;
  }
  if (gameId === 'checkers' || gameId === 'drafts') {
    const size = Number(oldState.size) || (gameId === 'drafts' ? 10 : 8); const from = Number(payload.from), to = Number(payload.to);
    if (Number.isFinite(from) && Number.isFinite(to)) {
      const square = (n: number) => `${String.fromCharCode(65 + n % size)}${size - Math.floor(n / size)}`;
      const captured = Array.isArray(payload.captured) ? payload.captured.length : payload.captured ? 1 : 0;
      return `${gameId === 'drafts' ? 'Draughts' : 'Checkers'} ${square(from)} → ${square(to)}${captured ? ` · captured ${captured}` : ''}${payload.promoted ? ' · crowned' : ''}`;
    }
  }
  if (gameId === 'chess') {
    if (payload.from && payload.to) return `Moved from ${payload.from} to ${payload.to}${payload.promotion ? ` · promoted to ${payload.promotion}` : ''}`;
    if (action === 'resign') return 'Resigned'; if (action === 'claim-draw') return 'Claimed a draw';
  }
  if (gameId === 'connect-four') {
    const index = Number(newState.lastDrop); const col = Number.isFinite(index) && index >= 0 ? index % (Number(newState.cols) || 7) + 1 : Number(payload.col) + 1;
    return `Dropped a piece in column ${col}`;
  }
  if (gameId === 'tic-tac-toe' || gameId === 'gomoku') {
    const index = Number(payload.index); const size = Number(oldState.size) || (gameId === 'tic-tac-toe' ? 3 : 15);
    if (Number.isFinite(index)) return `Placed a mark at ${String.fromCharCode(65 + index % size)}${size - Math.floor(index / size)}`;
  }
  if (gameId === 'ayo' && Number.isFinite(Number(payload.pit))) return `Sowed pit ${Number(payload.pit) + 1}${newState.captured && oldState.captured ? ` · captured ${newState.captured[move.player === oldState.playerIds?.[0] ? 0 : 1] - oldState.captured[move.player === oldState.playerIds?.[0] ? 0 : 1]} seeds` : ''}`;
  if (gameId === 'scrabble' && payload.word) return `Played “${String(payload.word).toUpperCase()}”`;
  if (['uno', 'whot', 'crazy-eights'].includes(gameId)) {
    if (action.includes('draw') || action === 'market') return gameId === 'whot' ? `Picked ${Number(payload.count) || 1} from the market` : 'Drew a card';
    if (action.includes('pass')) return 'Passed the turn';
    if (action.includes('uno')) return 'Called UNO';
    if (action.includes('challenge')) return 'Challenged Wild Draw Four';
    const cardId = String(payload.cardId ?? '');
    if (cardId) {
      if (gameId === 'uno') { const parts=cardId.split('-'); const colors:Record<string,string>={R:'Red',G:'Green',B:'Blue',Y:'Yellow',W:'Wild'}; const values:Record<string,string>={SKIP:'Skip',REV:'Reverse',DRAW2:'Draw Two',WILD:'Wild',WILD4:'Wild Draw Four'}; return `Played ${colors[parts[0]] ?? parts[0]} ${values[parts[1]] ?? parts[1] ?? ''}${payload.chosenColor ? ` · chose ${payload.chosenColor}` : ''}`.trim(); }
      if (gameId === 'whot') { const parts=cardId.split('-'); return `Played ${parts[0] === 'whot' ? 'Whot' : parts[0]} ${parts[1] ?? ''}${payload.requestedShape ? ` · called ${payload.requestedShape}` : ''}`.trim(); }
      const parts=cardId.split('-'); const suit:Record<string,string>={S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}; const rank:Record<string,string>={A:'Ace',J:'Jack',Q:'Queen',K:'King'}; return `Played ${rank[parts[1]] ?? parts[1] ?? 'a card'} of ${suit[parts[0]] ?? 'cards'}${payload.chosenSuit ? ` · chose ${payload.chosenSuit}` : ''}`;
    }
  }
  if (gameId === 'monopoly-deal') {
    const card = oldState.cards?.[payload.cardId]; if (card?.name) return `${action.replaceAll('_',' ')} · ${card.name}`;
  }
  if (gameId === 'treasure-hunt') return `Searched ${String.fromCharCode(65 + Number(payload.col ?? 0))}${Number(payload.row ?? 0) + 1}`;
  if (gameId === 'pirate-go') {
    if (action === 'place') return `Placed a stone at row ${Math.floor(Number(payload.index) / 9) + 1}, column ${Number(payload.index) % 9 + 1}`;
    if (action === 'pass') return 'Passed the turn';
  }
  return `${action.charAt(0).toUpperCase()}${action.slice(1).replaceAll('_',' ')}`;
}

export function legalMovesFor<S, M>(
  def: GameDefinition<S, M>,
  session: GameSession<S>,
  playerId: string,
): Move<M>[] {
  if (session.status !== 'playing') return [];

  if (def.currentPlayer(session.state) !== playerId) {
    return [];
  }

  return def.legalMoves(session.state, playerId);
}