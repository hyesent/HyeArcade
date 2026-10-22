import type { Player, Move } from '../../core/types';

export type Stone = 0 | 1 | 2;
export type PirateGoMode = 'classic' | 'go';
export type PirateGoPhase = 'playing' | 'scoring' | 'finished';
export interface PirateGoState {
  size: number;
  board: Stone[];
  previousBoard: Stone[] | null;
  positionHistory: string[];
  playerIds: string[];
  turn: number;
  captures: Record<string, number>;
  passes: number;
  ko: number | null;
  mode: PirateGoMode;
  phase: PirateGoPhase;
  deadStones: number[];
  scoreConfirmed: string[];
  scores: Record<string, number>;
  komi: number;
  log: string[];
  winner: string | null;
  finished: boolean;
}
export type PirateGoMove =
  | { action: 'place'; index: number }
  | { action: 'pass' }
  | { action: 'set-mode'; mode: PirateGoMode }
  | { action: 'toggle-dead'; index: number }
  | { action: 'confirm-score' };

const idx = (s: PirateGoState, r: number, c: number) => r * s.size + c;
const xy = (s: PirateGoState, i: number) => [Math.floor(i / s.size), i % s.size] as const;
function neighbors(s: PirateGoState, i: number) {
  const [r, c] = xy(s, i), out: number[] = [];
  if (r > 0) out.push(idx(s, r - 1, c));
  if (r < s.size - 1) out.push(idx(s, r + 1, c));
  if (c > 0) out.push(idx(s, r, c - 1));
  if (c < s.size - 1) out.push(idx(s, r, c + 1));
  return out;
}
export function pirateGroup(s: PirateGoState, start: number) {
  const color = s.board[start], seen = new Set<number>(), stones: number[] = [], q = [start];
  while (q.length) {
    const i = q.pop()!;
    if (seen.has(i) || s.board[i] !== color) continue;
    seen.add(i); stones.push(i);
    for (const n of neighbors(s, i)) if (s.board[n] === color && !seen.has(n)) q.push(n);
  }
  const libs = new Set<number>();
  for (const i of stones) for (const n of neighbors(s, i)) if (s.board[n] === 0) libs.add(n);
  return { stones, liberties: libs };
}
const signature = (board: Stone[]) => board.join('');
export function pirateCurrent(s: PirateGoState) { return s.playerIds[s.turn]; }
export function pirateSetup(players: Player[], boardId?: string): PirateGoState {
  const ids = players.slice(0, 2).map(p => p.id);
  return {
    size: 9, board: Array(81).fill(0), previousBoard: null, positionHistory: [Array(81).fill(0).join('')],
    playerIds: ids, turn: 0, captures: Object.fromEntries(ids.map(id => [id, 0])), passes: 0, ko: null,
    mode: boardId === 'traditional-go' ? 'go' : 'classic', phase: 'playing', deadStones: [], scoreConfirmed: [], scores: {}, komi: 7.5,
    log: [], winner: null, finished: false,
  };
}

function tryPlace(s: PirateGoState, i: number) {
  if (!Number.isInteger(i) || i < 0 || i >= s.board.length || s.board[i] !== 0) return null;
  const board = [...s.board];
  board[i] = s.turn === 0 ? 1 : 2;
  let captured = 0;
  const checked = new Set<number>();
  for (const n of neighbors(s, i)) {
    if (board[n] === 0 || board[n] === board[i] || checked.has(n)) continue;
    const temp: PirateGoState = { ...s, board };
    const g = pirateGroup(temp, n);
    g.stones.forEach(x => checked.add(x));
    if (g.liberties.size === 0) {
      for (const x of g.stones) board[x] = 0;
      captured += g.stones.length;
    }
  }
  const next: PirateGoState = { ...s, board };
  if (pirateGroup(next, i).liberties.size === 0 && captured === 0) return null;
  const sig = signature(board);
  // Positional superko: a board position may not repeat in Traditional Go.
  if (s.mode === 'go' && s.positionHistory.includes(sig)) return null;
  // Classic mode retains simple-ko behavior for the existing capture game.
  if (s.mode === 'classic' && s.previousBoard && sig === signature(s.previousBoard)) return null;
  return { board, captured };
}

export function pirateLegalMoves(s: PirateGoState, p: string): Move<PirateGoMove>[] {
  if (p !== pirateCurrent(s) || s.finished) return [];
  const out: Move<PirateGoMove>[] = [];
  if (s.phase === 'playing') {
    if (s.positionHistory.length === 1 && s.board.every(x => x === 0) && s.passes === 0) {
      out.push({ type: 'mode', player: p, payload: { action: 'set-mode', mode: s.mode === 'classic' ? 'go' : 'classic' }, ts: Date.now() });
    }
    if (s.mode === 'go' && s.passes >= 1) out.push({ type: 'pass', player: p, payload: { action: 'pass' }, ts: Date.now() });
    for (let i = 0; i < s.board.length; i++) if (tryPlace(s, i)) out.push({ type: 'place', player: p, payload: { action: 'place', index: i }, ts: Date.now() });
    out.push({ type: 'pass', player: p, payload: { action: 'pass' }, ts: Date.now() });
  } else if (s.phase === 'scoring') {
    out.push({ type: 'toggle-dead', player: p, payload: { action: 'toggle-dead', index: 0 }, ts: Date.now() });
    out.push({ type: 'confirm-score', player: p, payload: { action: 'confirm-score' }, ts: Date.now() });
  }
  return out;
}
export function pirateValidate(s: PirateGoState, m: Move<PirateGoMove>) {
  if (m.player !== pirateCurrent(s) || s.finished) return false;
  const a = m.payload;
  if (a.action === 'set-mode') return s.phase === 'playing' && s.board.every(x => x === 0) && s.passes === 0;
  if (s.phase === 'playing' && a.action === 'place') return !!tryPlace(s, a.index);
  if (s.phase === 'playing' && a.action === 'pass') return true;
  if (s.phase === 'scoring' && a.action === 'toggle-dead') return Number.isInteger(a.index) && a.index >= 0 && a.index < s.board.length && s.board[a.index] !== 0;
  if (s.phase === 'scoring' && a.action === 'confirm-score') return !s.scoreConfirmed.includes(m.player);
  return false;
}
function scoreGo(s: PirateGoState, dead: Set<number>) {
  const board = [...s.board];
  dead.forEach(i => { board[i] = 0; });
  const visited = new Set<number>();
  const territory: Record<string, number> = { [s.playerIds[0]]: 0, [s.playerIds[1]]: 0 };
  const stones: Record<string, number> = { [s.playerIds[0]]: 0, [s.playerIds[1]]: 0 };
  board.forEach((v) => { if (v === 1) stones[s.playerIds[0]]++; if (v === 2) stones[s.playerIds[1]]++; });
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== 0 || visited.has(i)) continue;
    const q = [i], region: number[] = [], borders = new Set<Stone>();
    while (q.length) {
      const x = q.pop()!;
      if (visited.has(x) || board[x] !== 0) continue;
      visited.add(x); region.push(x);
      for (const n of neighbors(s, x)) {
        if (board[n] === 0 && !visited.has(n)) q.push(n);
        else if (board[n] !== 0) borders.add(board[n]);
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0] === 1 ? s.playerIds[0] : s.playerIds[1];
      territory[owner] += region.length;
    }
  }
  return { [s.playerIds[0]]: stones[s.playerIds[0]] + territory[s.playerIds[0]], [s.playerIds[1]]: stones[s.playerIds[1]] + territory[s.playerIds[1]] + s.komi };
}
export function pirateApply(s: PirateGoState, m: Move<PirateGoMove>): PirateGoState {
  const a = m.payload;
  if (a.action === 'set-mode') return { ...s, mode: a.mode, log: [...s.log.slice(-7), a.mode === 'go' ? 'Traditional Go rules selected' : 'Classic Pirate rules selected'] };
  if (a.action === 'toggle-dead') {
    const group = pirateGroup(s, a.index).stones;
    const dead = new Set(s.deadStones);
    const allMarked = group.every(i => dead.has(i));
    group.forEach(i => allMarked ? dead.delete(i) : dead.add(i));
    return { ...s, deadStones: [...dead], scoreConfirmed: [], log: [...s.log.slice(-7), allMarked ? 'Group restored for scoring' : 'Group marked as dead'] };
  }
  if (a.action === 'confirm-score') {
    const confirmed = [...new Set([...s.scoreConfirmed, m.player])];
    if (confirmed.length < 2) return { ...s, scoreConfirmed: confirmed, turn: (s.turn + 1) % 2, log: [...s.log.slice(-7), `${m.player} confirmed the score`] };
    const scores = scoreGo(s, new Set(s.deadStones));
    const [one, two] = s.playerIds;
    const winner = scores[one] === scores[two] ? null : scores[one] > scores[two] ? one : two;
    return { ...s, scoreConfirmed: confirmed, scores, phase: 'finished', finished: true, winner, log: [...s.log.slice(-7), `Final area score: ${scores[one]}–${scores[two]}`] };
  }
  if (a.action === 'pass') {
    const passes = s.passes + 1;
    if (s.mode === 'go' && passes >= 2) return { ...s, passes, phase: 'scoring', deadStones: [], scoreConfirmed: [], turn: (s.turn + 1) % 2, log: [...s.log.slice(-7), 'Both players passed. Agree on dead groups, then confirm the score.'] };
    if (s.mode === 'classic' && passes >= 2) {
      const one = s.captures[s.playerIds[0]] ?? 0, two = s.captures[s.playerIds[1]] ?? 0;
      const winner = one === two ? null : one > two ? s.playerIds[0] : s.playerIds[1];
      return { ...s, passes, phase: 'finished', finished: true, winner, log: [...s.log.slice(-7), winner ? `${winner} wins on captures` : 'Game ended in a capture-score draw'] };
    }
    return { ...s, passes, turn: (s.turn + 1) % 2, ko: null, log: [...s.log.slice(-7), `${m.player} passed`] };
  }
  const result = tryPlace(s, a.index)!;
  const captures = { ...s.captures, [m.player]: (s.captures[m.player] ?? 0) + result.captured };
  const history = s.mode === 'go' ? [...s.positionHistory, signature(result.board)] : [signature(result.board)];
  return { ...s, board: result.board, previousBoard: s.board.slice(), positionHistory: history, captures, passes: 0, ko: null, turn: (s.turn + 1) % 2, log: [...s.log.slice(-7), `${m.player} captured ${result.captured} stone${result.captured === 1 ? '' : 's'}`] };
}
export function pirateOver(s: PirateGoState) {
  if (!s.finished) return null;
  if (s.mode === 'go') return { winner: s.winner, reason: s.winner ? `Traditional Go area scoring: ${s.scores[s.winner]}` : 'Traditional Go ended in a tie', scores: s.scores };
  return { winner: s.winner, reason: s.winner ? `Classic Pirate capture score: ${s.captures[s.winner]}` : 'Classic Pirate ended in a tie', scores: s.captures };
}
export function pirateBot(s: PirateGoState, p: string): Move<PirateGoMove> {
  const moves = pirateLegalMoves(s, p);
  if (s.phase === 'scoring') return moves.find(m => m.payload.action === 'confirm-score') ?? moves[0];
  if (s.board.every(x => x === 0) && s.mode === 'classic') return moves.find(m => m.payload.action === 'place') ?? moves[0];
  const placements = moves.filter(m => m.payload.action === 'place');
  return placements[Math.floor(Math.random() * placements.length)] ?? moves.find(m => m.payload.action === 'pass')!;
}
