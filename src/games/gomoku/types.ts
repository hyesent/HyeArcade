export type Stone = 'B' | 'W' | null;

export interface GomokuState {
  size: number;        // 15 standard
  board: Stone[];      // row-major
  turn: 0 | 1;
  playerIds: [string, string];
  lastMove: number | null;
}

export interface PlaceMove {
  index: number;
}