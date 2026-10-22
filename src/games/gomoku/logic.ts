import type { Stone } from './types';

export function idx(row: number, col: number, size: number): number {
  return row * size + col;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function findFive(
  board: Stone[],
  size: number,
): { winner: 'B' | 'W'; line: number[] } | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const start = board[idx(r, c, size)];
      if (!start) continue;

      for (const [dr, dc] of DIRS) {
        const line = [idx(r, c, size)];
        let ok = true;
        for (let k = 1; k < 5; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
            ok = false;
            break;
          }
          if (board[idx(nr, nc, size)] !== start) {
            ok = false;
            break;
          }
          line.push(idx(nr, nc, size));
        }
        if (ok) return { winner: start, line };
      }
    }
  }
  return null;
}

export function isFull(board: Stone[]): boolean {
  return board.every((c) => c !== null);
}