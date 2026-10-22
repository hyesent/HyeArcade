import type { CrazyEightsState } from './types';
import type { PlayingCard } from '../cards/types';
import { getCard } from '../cards/deck';

// Can this card be played on the current discard pile?
export function canPlay(
  card: PlayingCard,
  top: PlayingCard | null,
  suitToMatch: string | null,
): boolean {
  if (!top) return true;
  if (card.rank === '8') return true;
  if (suitToMatch && card.suit === suitToMatch) return true;
  if (card.suit === top.suit) return true;
  if (card.rank === top.rank) return true;
  return false;
}

export function playableIds(
  state: CrazyEightsState,
  playerId: string,
): Set<string> {
  const hand = state.hands.find((h) => h.playerId === playerId);
  if (!hand) return new Set();

  const top = state.discardPile.length
    ? getCard(state.discardPile[state.discardPile.length - 1])
    : null;

  const playable = new Set<string>();
  for (const id of hand.cards) {
    const card = getCard(id);
    if (canPlay(card, top, state.suitToMatch)) playable.add(id);
  }
  return playable;
}