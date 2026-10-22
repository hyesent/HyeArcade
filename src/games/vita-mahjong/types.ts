export type TileSuit = 'bam' | 'cir' | 'chr' | 'wind' | 'dragon' | 'flower' | 'season';

export interface VitaTile {
  id: string;
  kind: string;
  suit: TileSuit;
  label: string;
  x: number;
  y: number;
  layer: number;
  removed: boolean;
  inTray: boolean;
}

export interface VitaSnapshot {
  tiles: VitaTile[];
  tray: string[];
  matches: number;
  combo: number;
  bestCombo: number;
  score: number;
}

export interface VitaMahjongState {
  playerId: string;
  tiles: VitaTile[];
  tray: string[];
  selected: string | null;
  hintPair: [string, string] | null;
  matches: number;
  combo: number;
  bestCombo: number;
  score: number;
  hints: number;
  shuffles: number;
  history: VitaSnapshot[];
}
