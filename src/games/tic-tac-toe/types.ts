export type Cell = 'X' | 'O' | null;

export interface TicTacToeState {
  board: Cell[];
  turn: 0 | 1;
  playerIds: [string, string];
}

export interface PlaceMove {
  index: number;
}