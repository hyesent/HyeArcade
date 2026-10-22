import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { ConnectFourState, DropMove, Cell } from './types';
import { findWin, landingRow, idx } from './logic';

const COLS = 7;
const ROWS = 6;

export function connectFourBot(
  state: ConnectFourState,
  player: PlayerId,
  difficulty: BotDifficulty,
): Move<DropMove> {
  const me = state.turn === 0 ? 'R' : 'Y';
  const opponent: Cell = me === 'R' ? 'Y' : 'R';

  const legal = legalCols(state);
  if (legal.length === 0) {
    return { type: 'drop', player, payload: { col: 0 }, ts: Date.now() };
  }

  let col: number;

  if (difficulty === 'easy') {
    col = Math.random() < 0.4 ? bestImmediate(state, me) ?? randomOf(legal) : randomOf(legal);
  } else if (difficulty === 'medium') {
    col = bestImmediate(state, me) ?? bestImmediate(state, opponent) ?? randomOf(legal);
  } else {
    col = minimaxChoice(state, me);
  }

  return { type: 'drop', player, payload: { col }, ts: Date.now() };
}

function legalCols(state: ConnectFourState): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (landingRow(state.board, COLS, ROWS, c) !== -1) out.push(c);
  }
  return out;
}

function randomOf(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Returns a column that would immediately win for `who`, or null.
function bestImmediate(state: ConnectFourState, who: Cell): number | null {
  for (let c = 0; c < COLS; c++) {
    const r = landingRow(state.board, COLS, ROWS, c);
    if (r === -1) continue;
    const copy = [...state.board];
    copy[idx(r, c, COLS)] = who;
    if (findWin(copy, COLS, ROWS, 4)) return c;
  }
  return null;
}

// Minimax with alpha-beta, depth 5. Fine for 7x6 on phones.
function minimaxChoice(state: ConnectFourState, me: 'R' | 'Y'): number {
  const board = [...state.board];
  const legal = legalCols(state);

  let bestScore = -Infinity;
  let bestCol = legal[0];

  // Prefer center columns
  const ordered = [...legal].sort(
    (a, b) => Math.abs(3 - a) - Math.abs(3 - b),
  );

  for (const c of ordered) {
    const r = landingRow(board, COLS, ROWS, c);
    if (r === -1) continue;
    board[idx(r, c, COLS)] = me;
    const score = -negamax(board, 1, 5, me === 'R' ? 'Y' : 'R', me);
    board[idx(r, c, COLS)] = null;

    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }

  return bestCol;
}

function negamax(
  board: Cell[],
  depth: number,
  maxDepth: number,
  toMove: 'R' | 'Y',
  me: 'R' | 'Y',
): number {
  const win = findWin(board, COLS, ROWS, 4);
  if (win) return win.winner === me ? 1000 - depth : -1000 + depth;
  if (board.every((c) => c !== null)) return 0;
  if (depth >= maxDepth) return evaluate(board, me);

  const legal: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (landingRow(board, COLS, ROWS, c) !== -1) legal.push(c);
  }
  legal.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

  let best = -Infinity;
  for (const c of legal) {
    const r = landingRow(board, COLS, ROWS, c);
    board[idx(r, c, COLS)] = toMove;
    const score = -negamax(
      board,
      depth + 1,
      maxDepth,
      toMove === 'R' ? 'Y' : 'R',
      me,
    );
    board[idx(r, c, COLS)] = null;
    if (score > best) best = score;
  }

  return best;
}

function evaluate(board: Cell[], me: 'R' | 'Y'): number {
  // Simple heuristic: count 2s and 3s in all directions
  const opp: Cell = me === 'R' ? 'Y' : 'R';
  let score = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as [number, number][]) {
        const seq: Cell[] = [];
        for (let k = 0; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
          seq.push(board[idx(nr, nc, COLS)]);
        }
        if (seq.length < 4) continue;
        const mine = seq.filter((x) => x === me).length;
        const theirs = seq.filter((x) => x === opp).length;
        const empty = seq.filter((x) => x === null).length;
        if (mine > 0 && theirs > 0) continue;
        if (mine === 3 && empty === 1) score += 30;
        else if (mine === 2 && empty === 2) score += 8;
        if (theirs === 3 && empty === 1) score -= 30;
        else if (theirs === 2 && empty === 2) score -= 8;
      }
    }
  }

  // Center column preference
  for (let r = 0; r < ROWS; r++) {
    const v = board[idx(r, 3, COLS)];
    if (v === me) score += 3;
    else if (v === opp) score -= 3;
  }

  return score;
}