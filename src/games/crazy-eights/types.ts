import type { CardGameState } from '../cards/types';

export interface CrazyEightsState extends CardGameState {
  playerIds: string[];
  suitToMatch: string | null;    // when 8 is played, suit is chosen
  lastPlayer: string | null;
}

export interface PlayMove {
  cardId: string;
  chosenSuit?: 'S' | 'H' | 'D' | 'C';   // required only when playing an 8
}

export type CrazyEightsMove = PlayMove | { type: 'draw' };