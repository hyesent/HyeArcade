import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { GomokuState, PlaceMove } from './types';
import { findFive } from './logic';

export function gomokuBot(
  state: GomokuState,
  player: PlayerId,
  difficulty: BotDifficulty,
): Move<PlaceMove> {
  const me: 'B' | 'W' = state.turn === 0 ? 'B' : 'W';
  const opp: 'B' | 'W' = me === 'B' ? 'W' : 'B';

  const empties = emptyIndices(state);
  if (empties.length === 0) {
    return { type: 'place', player, payload: { index: 0 }, ts: Date.now() };
  }

  if (difficulty === 'easy') {
    const win = findWinning(state, me);
    if (win !== -1 && Math.random() < 0.35) return mk(player, win);
    return mk(player, randomOf(empties));
  }

  if (difficulty === 'medium') {
    const win = findWinning(state, me);
    if (win !== -1) return mk(player, win);
    const block = findWinning(state, opp);
    if (block !== -1) return mk(player, block);
    return mk(player, bestByScore(state, me, opp, 1));
  }

  // hard — best move by weighted score (threats + blocks)
  const win = findWinning(state, me);
  if (win !== -1) return mk(player, win);
  const block = findWinning(state, opp);
  if (block !== -1) return mk(player, block);

  return mk(player, bestByScore(state, me, opp, 2));
}

function mk(player: PlayerId, index: number): Move<PlaceMove> {
  return { type: 'place', player, payload: { index }, ts: Date.now() };
}

function emptyIndices(state: GomokuState): number[] {
  const out: number[] = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) out.push(i);
  }
  return out;
}

function randomOf(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findWinning(state: GomokuState, who: 'B' | 'W'): number {
  const { board, size } = state;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    const r = Math.floor(i / size);
    const c = i % size;

    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let k = 1; k < 5; k++) {
        const nr = r + dr * k;
        const nc = c + dc * k;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
        if (board[nr * size + nc] === who) count++;
        else break;
      }
      for (let k = 1; k < 5; k++) {
        const nr = r - dr * k;
        const nc = c - dc * k;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
        if (board[nr * size + nc] === who) count++;
        else break;
      }
      if (count >= 5) return i;
    }
  }
  return -1;
}

function bestByScore(
  state: GomokuState,
  me: 'B' | 'W',
  opp: 'B' | 'W',
  lookahead: number,
): number {
  const empties = emptyIndices(state);
  const candidates = empties.filter((i) => hasNeighbor(state, i, 2));
  const pool = candidates.length > 0 ? candidates : empties;

  let best = pool[0];
  let bestScore = -Infinity;

  for (const i of pool) {
    const attack = scoreAt(state, i, me);
    const defend = scoreAt(state, i, opp);
    const score = attack * 1.1 + defend + centerBonus(state, i);

    if (lookahead > 1) {
      // shallow two-ply: assume opponent replies best; approximate
      const reply = bestReplyScore(state, i, opp);
      if (score - reply * 0.9 > bestScore) {
        bestScore = score - reply * 0.9;
        best = i;
      }
    } else if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return best;
}

function bestReplyScore(state: GomokuState, index: number, opp: 'B' | 'W'): number {
  const copy = [...state.board];
  copy[index] = opp;
  let max = 0;
  for (let i = 0; i < copy.length; i++) {
    if (copy[i] !== null) continue;
    const s = scoreAt({ ...state, board: copy }, i, opp);
    if (s > max) max = s;
  }
  return max;
}

function scoreAt(state: GomokuState, index: number, who: 'B' | 'W'): number {
  const { size } = state;
  const r = Math.floor(index / size);
  const c = index % size;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

  let total = 0;
  for (const [dr, dc] of dirs) {
    let count = 1;
    let open = 0;
    for (let k = 1; k < 5; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
      const v = state.board[nr * size + nc];
      if (v === who) count++;
      else if (v === null) {
        open++;
        break;
      } else break;
    }
    for (let k = 1; k < 5; k++) {
      const nr = r - dr * k;
      const nc = c - dc * k;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
      const v = state.board[nr * size + nc];
      if (v === who) count++;
      else if (v === null) {
        open++;
        break;
      } else break;
    }

    if (count >= 5) total += 100000;
    else if (count === 4 && open >= 1) total += 10000;
    else if (count === 3 && open >= 2) total += 1000;
    else if (count === 3 && open === 1) total += 200;
    else if (count === 2 && open >= 2) total += 50;
    else if (count === 2 && open === 1) total += 10;
  }

  return total;
}

function hasNeighbor(state: GomokuState, index: number, radius: number): boolean {
  const { size, board } = state;
  const r = Math.floor(index / size);
  const c = index % size;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (board[nr * size + nc] !== null) return true;
    }
  }
  return false;
}

function centerBonus(state: GomokuState, index: number): number {
  const { size } = state;
  const r = Math.floor(index / size);
  const c = index % size;
  const center = (size - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  return Math.max(0, 10 - dist);
}

// silence unused warning — findFive kept for future use
void findFive;