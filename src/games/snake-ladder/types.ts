export interface SnakeLadderState {
  size: number;                    // 100 for classic, 10x10 board
  players: SeatState[];
  turn: number;                    // index into players
  dice: number | null;
  lastRoll: number | null;
}

export interface SeatState {
  id: string;                      // playerId
  name: string;
  color: string;
  position: number;                // 0 = off board, 1..100 = on tile
  finished: boolean;               // reached exactly 100
  rolls: number;                   // total rolls, for tie-break
}

export interface RollMove {
  value: number;                   // 1..6, chosen by server/bot/human-tap
}

// Snakes: head -> tail.  Ladders: bottom -> top.
// All numbers 1..100.
export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};