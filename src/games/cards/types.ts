export type Suit = 'S' | 'H' | 'D' | 'C';    // spades, hearts, diamonds, clubs
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  id: string;            // unique per card, e.g. "S-A", "H-10"
  suit: Suit;
  rank: Rank;
}

export type CardId = string;

// Shared per-player hand state
export interface Hand {
  playerId: string;
  cards: CardId[];
  hasCalledUno?: boolean;   // UNO-specific, harmless elsewhere
  hasSaidWhot?: boolean;    // Whot-specific
}

// Shared state every card game embeds
export interface CardGameState {
  deck: CardId[];
  discardPile: CardId[];
  hands: Hand[];
  turn: number;             // index into hands
  drawCount: number;        // for stacking (UNO +2, Whot Pick Two)
  direction: 1 | -1;        // for reverse cards
  lastPlayed: CardId | null;
}