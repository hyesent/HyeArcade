import type { Cell } from './types';

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function getWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

export function isDraw(board: Cell[]): boolean {
  return board.every((c) => c !== null) && !getWinner(board);
}

export function emptyIndices(board: Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) out.push(i);
  }
  return out;
}