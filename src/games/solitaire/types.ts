export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface SolitaireState {
  playerId: string;
  stock: Card[];          // draw pile
  waste: Card[];          // flipped cards
  foundations: Card[][];  // 4 piles, one per suit, built A→K
  tableau: Card[][];      // 7 columns
  moves: number;
}

export type SolitaireMove =
  | { type: 'draw' }                                     // stock → waste
  | { type: 'recycle' }                                  // waste → stock
  | { type: 'waste-to-foundation'; foundationIdx: number }
  | { type: 'waste-to-tableau'; tableauIdx: number }
  | { type: 'tableau-to-foundation'; tableauIdx: number; foundationIdx: number }
  | { type: 'tableau-to-tableau'; fromIdx: number; cardIdx: number; toIdx: number }
  | { type: 'flip-tableau'; tableauIdx: number };