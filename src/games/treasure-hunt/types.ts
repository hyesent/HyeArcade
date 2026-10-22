export interface TreasureGuess { row: number; col: number; distance: number; playerId: string; }
export interface TreasureHuntState {
  playerIds: string[];
  turn: number;
  size: number;
  treasure: { row: number; col: number };
  guesses: TreasureGuess[];
  misses: Record<string, number>;
  bestDistance: Record<string, number>;
  maxGuesses: number;
  log: string[];
}
export interface TreasureMove { row: number; col: number; }
