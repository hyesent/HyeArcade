export type Color = 'R' | 'B' | 'G' | 'Y';

export interface Pawn {
  id: number;              // 0..3 within its color
  color: Color;
  state: 'yard' | 'ring' | 'home-col' | 'finished';
  step: number;            // -1 = yard, 0..51 ring, 52..56 home column, 57 = finished
}

export interface LudoState {
  colors: Color[];         // active colors, in seat order
  playerIds: Record<Color, string>;  // color -> playerId
  pawns: Pawn[];           // 16 max, in seat order
  turn: number;            // index into colors
  dice: number | null;               // currently selected die value
  remainingDice: [boolean, boolean]; // which rolled dice are still available
  selectedDie: 0 | 1 | null;
  rolling: boolean;        // UI hint, not used by engine
  mustMove: boolean;       // true when player must pick a pawn to move
  lastRoll: [number, number] | null;
}

export interface RollMove { value: number; die1?: number; die2?: number; doubles?: boolean; }
export interface SelectMove { dieIndex: 0 | 1; }
export interface PickMove { pawnIndex: number; dieIndex?: 0 | 1; }  // 0..15 across all pawns

// Shared geometry
export const RING_LENGTH = 52;
export const HOME_COL_LENGTH = 5;
export const FINISH_STEP = 57;

// Ring start step for each color
export const START_STEP: Record<Color, number> = {
  R: 0,   // left / red start
  G: 13,  // top / green start
  Y: 26,  // right / yellow start
  B: 39,  // bottom / blue start
};

// Safe squares (absolute ring positions)
export const SAFE_SQUARES = new Set<number>([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

export const COLOR_ORDER: Color[] = ['R', 'G', 'Y', 'B'];

export const COLOR_HEX: Record<Color, string> = {
  R: '#ef3149',
  G: '#20b96f',
  Y: '#ffd21e',
  B: '#2aa9ef',
};