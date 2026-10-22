export type TileSuit = 'bam' | 'cir' | 'chr' | 'wind' | 'dragon' | 'flower' | 'season';

export interface Tile {
  id: string;
  kind: string;      // unique match key — matching pairs have same kind
  suit: TileSuit;
  label: string;
  x: number;         // grid column
  y: number;         // grid row
  layer: number;     // 0 = bottom, 1 = above, 2 = top
  removed: boolean;
}

export interface MahjongSolitaireState {
  playerId: string;
  tiles: Tile[];
  selected: string | null;
  movesLeft: number;      // optional hint budget
  matches: number;
}