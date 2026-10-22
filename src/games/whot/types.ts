export type WhotShape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface WhotCard {
  id: string;
  shape: WhotShape;
  number: number;   // 1..14, or 20 for Whot
}

export interface WhotState {
  playerIds: string[];
  hands: { playerId: string; cards: string[] }[];
  deck: string[];
  discardPile: string[];
  turn: number;
  marketCount: number;      // for Pick Two / Pick Three stacking
  requiredShape: WhotShape | null;   // after Whot is played
  lastPlayed: string | null;
}

export type WhotMove =
  | { cardId: string; requestedShape?: WhotShape }
  | { type: 'market'; count?: number }
  | { type: 'pass' };
