export type Cell = 'R' | 'Y' | null;

export interface ConnectFourState {
  cols: number;
  rows: number;
  board: Cell[];      // row-major: index = row * cols + col
  turn: 0 | 1;
  playerIds: [string, string];
  lastDrop: number | null;  // index of last placed piece, for animation
}

export interface DropMove {
  col: number;
}