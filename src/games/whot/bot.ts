import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { WhotState, WhotMove, WhotShape } from './types';
import { getWhotCard, canPlayWhot } from './deck';

export function whotBot(
  state: WhotState,
  player: PlayerId,
  difficulty: BotDifficulty,
): Move<WhotMove> {
  const hand = state.hands.find((h) => h.playerId === player);
  if (!hand) {
    return { type: 'play', player, payload: { type: 'market', count: state.marketCount > 0 ? state.marketCount : 1 }, ts: Date.now() };
  }

  const top = getWhotCard(state.discardPile[state.discardPile.length - 1]);
  const playable = hand.cards.filter((id) =>
    canPlayWhot(getWhotCard(id), top, state.requiredShape, state.marketCount),
  );

  if (playable.length === 0) {
    return { type: 'play', player, payload: { type: 'market', count: state.marketCount > 0 ? state.marketCount : 1 }, ts: Date.now() };
  }

  if (difficulty === 'easy') {
    const pick = playable[0];
    return mk(player, pick, state);
  }

  // Prefer non-Whot, prefer matching shape over number
  const nonWhot = playable.filter((id) => !id.startsWith('whot-'));
  const pick = nonWhot[0] ?? playable[0];

  return mk(player, pick, state);
}

function mk(player: PlayerId, cardId: string, state: WhotState): Move<WhotMove> {
  const card = getWhotCard(cardId);
  if (card.shape === 'whot') {
    // Ask for the most common shape in hand
    const counts: Record<string, number> = {};
    const hand = state.hands.find((h) => h.playerId === player)!;
    for (const id of hand.cards) {
      const c = getWhotCard(id);
      if (c.shape !== 'whot') counts[c.shape] = (counts[c.shape] ?? 0) + 1;
    }
    const best =
      (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as WhotShape) ??
      'circle';
    return {
      type: 'play',
      player,
      payload: { cardId, requestedShape: best },
      ts: Date.now(),
    };
  }
  return {
    type: 'play',
    player,
    payload: { cardId },
    ts: Date.now(),
  };
}