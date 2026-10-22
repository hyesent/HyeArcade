import type { Cell } from './types';

export function idx(row: number, col: number, cols: number): number {
  return row * cols + col;
}

// Returns the row index where a piece would land in the given column,
// or -1 if the column is full.
export function landingRow(board: Cell[], cols: number, rows: number, col: number): number {
  for (let r = rows - 1; r >= 0; r--) {
    if (board[idx(r, col, cols)] === null) return r;
  }
  return -1;
}

export function fullColumns(board: Cell[], cols: number, rows: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (landingRow(board, cols, rows, c) === -1) out.push(c);
  }
  return out;
}

const DIRS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

export function findWin(
  board: Cell[],
  cols: number,
  rows: number,
  connect: number,
): { winner: 'R' | 'Y'; line: number[] } | null {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const start = board[idx(r, c, cols)];
      if (!start) continue;

      for (const [dr, dc] of DIRS) {
        const line: number[] = [idx(r, c, cols)];
        let ok = true;
        for (let k = 1; k < connect; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            ok = false;
            break;
          }
          if (board[idx(nr, nc, cols)] !== start) {
            ok = false;
            break;
          }
          line.push(idx(nr, nc, cols));
        }
        if (ok) return { winner: start, line };
      }
    }
  }
  return null;
}

export function isFull(board: Cell[]): boolean {
  return board.every((c) => c !== null);
}