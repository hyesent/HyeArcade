import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { TicTacToeState, PlaceMove } from './types';
import { emptyIndices, getWinner } from './logic';

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function ticTacToeBot(
  state: TicTacToeState,
  _player: PlayerId,
  difficulty: BotDifficulty,
): Move<PlaceMove> {
  const me = state.playerIds[state.turn];
  const mark = state.turn === 0 ? 'X' : 'O';

  const index = pickMove(state, mark, difficulty);

  return {
    type: 'place',
    player: me,
    payload: { index },
    ts: Date.now(),
  };
}

function pickMove(state: TicTacToeState, mark: 'X' | 'O', difficulty: BotDifficulty): number {
  const empty = emptyIndices(state.board);
  const opponent: 'X' | 'O' = mark === 'X' ? 'O' : 'X';

  if (difficulty === 'easy') {
    // 70% random, 30% takes obvious win
    const win = findWinningMove(state.board, mark);
    if (win !== -1 && Math.random() < 0.3) return win;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  if (difficulty === 'medium') {
    // Win if possible, block if needed, else random
    const win = findWinningMove(state.board, mark);
    if (win !== -1) return win;
    const block = findWinningMove(state.board, opponent);
    if (block !== -1) return block;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // hard — perfect minimax
  return minimax(state.board, mark, mark);
}

function findWinningMove(board: (string | null)[], mark: string): number {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const cells = [board[a], board[b], board[c]];
    const mine = cells.filter((c) => c === mark).length;
    const emptyCount = cells.filter((c) => c === null).length;
    if (mine === 2 && emptyCount === 1) {
      return line[cells.findIndex((c) => c === null)];
    }
  }
  return -1;
}

function minimax(board: (string | null)[], toMove: string, me: string): number {
  const win = getWinner(board as never);
  if (win) return win.winner === me ? 10 : -10;
  if (board.every((c) => c !== null)) return 0;

  const opponent = toMove === 'X' ? 'O' : 'X';
  const empties = emptyIndices(board as never);

  let best = toMove === me ? -Infinity : Infinity;

  for (const i of empties) {
    board[i] = toMove;
    const score = minimax(board, opponent, me);
    board[i] = null;

    if (toMove === me) {
      if (score > best) best = score;
    } else {
      if (score < best) best = score;
    }
  }

  return best;
}