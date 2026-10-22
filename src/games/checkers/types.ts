export type Cell = 'r' | 'R' | 'b' | 'B' | null;
// r = red man, R = red king
// b = black man, B = black king

export interface CheckersState {
  size: number;             // 8 or 10
  board: Cell[];            // row-major, index = row * size + col
  turn: 0 | 1;              // 0 = red, 1 = black
  playerIds: [string, string];
  lastMove: { from: number; to: number; captured: number | null } | null;
  forcedFrom: number | null;
}

export interface CheckersMove {
  from: number;
  to: number;
  captured: number | null;  // index of captured piece, or null
  /** Progression telemetry: true when this move crowns a man. Rules ignore this derived flag. */
  promoted?: boolean;
}