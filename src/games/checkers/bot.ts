import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { CheckersState, CheckersMove } from './types';
import {
  applyMoveToBoard,
  colorOf,
  legalMovesFor,
  isKing,
} from './logic';

export function checkersBot(
  state: CheckersState,
  player: PlayerId,
  difficulty: BotDifficulty,
): Move<CheckersMove> {
  const playerIdx = state.turn;
  const legal = legalMovesFor(state, playerIdx);
  if (legal.length === 0) {
    return {
      type: 'move',
      player,
      payload: { from: -1, to: -1, captured: null },
      ts: Date.now(),
    };
  }

  let pick: CheckersMove;

  if (difficulty === 'easy') {
    pick = legal[Math.floor(Math.random() * legal.length)];
  } else if (difficulty === 'medium') {
    pick = bestMove(state, legal, playerIdx, 2);
  } else {
    pick = bestMove(state, legal, playerIdx, 5);
  }

  const piece = state.board[pick.from];
  const targetRow = Math.floor(pick.to / state.size);
  const promoted = (piece === 'r' && targetRow === 0) || (piece === 'b' && targetRow === state.size - 1);
  return {
    type: 'move',
    player,
    payload: promoted ? { ...pick, promoted: true } : pick,
    ts: Date.now(),
  };
}

function bestMove(
  state: CheckersState,
  legal: CheckersMove[],
  playerIdx: 0 | 1,
  depth: number,
): CheckersMove {
  let bestScore = -Infinity;
  let best = legal[0];

  for (const move of legal) {
    const nextBoard = applyMoveToBoard(state.board, move, state.size);
    const nextState: CheckersState = {
      ...state,
      board: nextBoard,
      turn: playerIdx === 0 ? 1 : 0,
    };
    const score = -negamax(nextState, depth - 1, playerIdx);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

function negamax(
  state: CheckersState,
  depth: number,
  rootPlayer: 0 | 1,
): number {
  const playerIdx = state.turn;
  const legal = legalMovesFor(state, playerIdx);

  // No moves = loss for current player
  if (legal.length === 0) {
    return playerIdx === rootPlayer ? -1000 - depth : 1000 + depth;
  }

  if (depth <= 0) return evaluate(state, rootPlayer);

  let best = -Infinity;
  for (const move of legal) {
    const nextBoard = applyMoveToBoard(state.board, move, state.size);
    const nextState: CheckersState = {
      ...state,
      board: nextBoard,
      turn: playerIdx === 0 ? 1 : 0,
    };
    const score = -negamax(nextState, depth - 1, rootPlayer);
    if (score > best) best = score;
  }
  return best;
}

function evaluate(state: CheckersState, rootPlayer: 0 | 1): number {
  let score = 0;
  for (const cell of state.board) {
    if (!cell) continue;
    const color = colorOf(cell)!;
    const value = isKing(cell) ? 5 : 1;
    // Score from root player's perspective
    score += color === (rootPlayer === 0 ? 'r' : 'b') ? value : -value;
  }
  return score;
}