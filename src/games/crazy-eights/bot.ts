import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { CrazyEightsState, CrazyEightsMove } from './types';
import { playableIds } from './logic';
import { getCard } from '../cards/deck';

export function crazyEightsBot(
  state: CrazyEightsState,
  player: PlayerId,
  difficulty: BotDifficulty,
): Move<CrazyEightsMove> {
  const playable = playableIds(state, player);
  const hand = state.hands.find((h) => h.playerId === player);

  // No cards playable — draw
  if (playable.size === 0 || !hand) {
    return {
      type: 'play',
      player,
      payload: { type: 'draw' },
      ts: Date.now(),
    };
  }

  const options = [...playable];

  if (difficulty === 'easy') {
    const pick = options[Math.floor(Math.random() * options.length)];
    return mk(player, pick);
  }

  // Medium/hard: prefer non-8s, then 8s, then highest count suit
  const nonEight = options.filter((id) => getCard(id).rank !== '8');

  let pick: string;
  if (nonEight.length > 0) {
    pick = nonEight[Math.floor(Math.random() * nonEight.length)];
  } else {
    pick = options[0];
  }

  return mk(player, pick);
}

function mk(player: PlayerId, cardId: string): Move<CrazyEightsMove> {
  const card = getCard(cardId);
  const payload: CrazyEightsMove =
    card.rank === '8'
      ? { cardId, chosenSuit: randomSuit() }
      : { cardId };
  return { type: 'play', player, payload, ts: Date.now() };
}

function randomSuit(): 'S' | 'H' | 'D' | 'C' {
  const suits: ('S' | 'H' | 'D' | 'C')[] = ['S', 'H', 'D', 'C'];
  return suits[Math.floor(Math.random() * 4)];
}