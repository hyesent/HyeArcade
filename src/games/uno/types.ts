export type UnoColor = 'R' | 'G' | 'B' | 'Y' | 'W';  // W = wild
export type UnoValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REV' | 'DRAW2' | 'WILD' | 'WILD4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

export interface UnoState {
  playerIds: string[];
  hands: { playerId: string; cards: string[]; hasCalledUno: boolean }[];
  deck: string[];
  discardPile: string[];
  turn: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  pendingDraw: number;      // classic UNO: pending +2/+4 penalty to be drawn
  lastPlayed: string | null;
  /** The only card that may be played after a normal draw. */
  drawnCardId: string | null;
  scores: Record<string, number>;
  round: number;
  roundStarter: number;
  matchWinner: string | null;
  wild4Challenge: { playerId: string; previousColor: UnoColor } | null;
}

export type UnoMove =
  | { cardId: string; chosenColor?: UnoColor }
  | { type: 'draw' }
  | { type: 'callUno'; targetPlayerId?: string }
  | { type: 'challengeWild4' }
  | { type: 'pass' };
