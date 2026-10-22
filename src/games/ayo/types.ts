export interface AyoState {
  pits: number[]; // indices 0-5 are the far row, 6-11 the near row
  playerIds: [string, string];
  turn: 0 | 1;
  captured: [number, number];
  moves: number;
  lastPit: number | null;
  repetitions: Record<string, number>;
  draw: boolean;
}
export interface AyoMove { pit: number; }
