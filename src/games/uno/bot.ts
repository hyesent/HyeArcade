import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { UnoState, UnoMove } from './types';
import { getUnoCard, canPlayUno } from './deck';

export function unoBot(
  state: UnoState,
  player: PlayerId,
  _difficulty: BotDifficulty,
): Move<UnoMove> {
  const hand = state.hands.find((h) => h.playerId === player);
  if (!hand) {
    return { type: 'play', player, payload: { type: 'draw' }, ts: Date.now() };
  }

  if (state.wild4Challenge?.playerId === player) {
    return { type: 'play', player, payload: { type: 'challengeWild4' }, ts: Date.now() };
  }

  const top = getUnoCard(state.discardPile[state.discardPile.length - 1]);
  const playable = hand.cards.filter((id) =>
    canPlayUno(getUnoCard(id), top, state.activeColor, state.pendingDraw, hand.cards.map(getUnoCard)),
  );

  if (playable.length === 0) {
    return { type: 'play', player, payload: { type: 'draw' }, ts: Date.now() };
  }

  // Prefer non-wild
  const nonWild = playable.filter((id) => !id.startsWith('W-'));
  const pick = nonWild[0] ?? playable[0];
  const card = getUnoCard(pick);

  if (card.value === 'WILD' || card.value === 'WILD4') {
    // Pick the most common color in hand
    const counts: Record<string, number> = { R: 0, G: 0, B: 0, Y: 0 };
    for (const id of hand.cards) {
      const c = getUnoCard(id);
      if (c.color !== 'W') counts[c.color]++;
    }
    const best = (Object.entries(counts) as [string, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0][0];
    return {
      type: 'play',
      player,
      payload: { cardId: pick, chosenColor: best as 'R' | 'G' | 'B' | 'Y' },
      ts: Date.now(),
    };
  }

  return {
    type: 'play',
    player,
    payload: { cardId: pick },
    ts: Date.now(),
  };
}