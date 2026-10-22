import type { GameDefinition, Move, Player } from '../../core/types';
import type { CrazyEightsState, CrazyEightsMove } from './types';
import { buildStandardDeck, getCard, shuffle } from '../cards/deck';
import { playableIds } from './logic';
import { crazyEightsBot } from './bot';

const START_HAND = 5;

export const crazyEights: GameDefinition<CrazyEightsState, CrazyEightsMove> = {
  id: 'crazy-eights',
  name: 'Crazy Eights',
  minPlayers: 2,
  maxPlayers: 4,

  icon: 'crazy-eights',
  color: '#FF7A45',
  tags: ['card', 'classic', 'family'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): CrazyEightsState {
    const deck = shuffle(buildStandardDeck()).map((c) => c.id);
    const hands = players.map((p) => ({ playerId: p.id, cards: [] as string[] }));

    for (let i = 0; i < START_HAND; i++) {
      for (const h of hands) h.cards.push(deck.pop()!);
    }

    const starter = deck.pop()!;
    const starterCard = getCard(starter);
    // If starter is an 8, flip another
    let discard = [starter];
    if (starterCard.rank === '8') {
      const next = deck.pop()!;
      discard.push(next);
    }

    return {
      playerIds: players.map((p) => p.id),
      deck,
      discardPile: discard,
      hands,
      turn: 0,
      drawCount: 0,
      direction: 1,
      lastPlayed: discard[discard.length - 1],
      suitToMatch: null,
      lastPlayer: null,
    };
  },

  currentPlayer(state) {
    return state.hands[state.turn].playerId;
  },

  legalMoves(state, player) {
    const playable = playableIds(state, player);
    const moves: Move<CrazyEightsMove>[] = [];

    for (const id of playable) {
      const card = getCard(id);
      if (card.rank === '8') {
        for (const suit of ['S', 'H', 'D', 'C'] as const) {
          moves.push({
            type: 'play',
            player,
            payload: { cardId: id, chosenSuit: suit },
            ts: Date.now(),
          });
        }
      } else {
        moves.push({
          type: 'play',
          player,
          payload: { cardId: id },
          ts: Date.now(),
        });
      }
    }

    // Always allow drawing
    moves.push({
      type: 'play',
      player,
      payload: { type: 'draw' },
      ts: Date.now(),
    });

    return moves;
  },

  validate(state, move) {
    const hand = state.hands[state.turn];
    const payload = move.payload;

    if ('type' in payload && payload.type === 'draw') {
      return true;
    }

    const play = payload as { cardId: string; chosenSuit?: string };
    if (!hand.cards.includes(play.cardId)) return false;
    return playableIds(state, state.playerIds[state.turn]).has(play.cardId);
  },

  apply(state, move) {
    const payload = move.payload;
    const hands = state.hands.map((h) => ({ ...h, cards: [...h.cards] }));
    const current = hands[state.turn];
    const deck = [...state.deck];
    const discardPile = [...state.discardPile];

    if ('type' in payload && payload.type === 'draw') {
      if (deck.length === 0) reshuffle(deck, discardPile);
      if (deck.length > 0) current.cards.push(deck.pop()!);
      return {
        ...state,
        deck,
        discardPile,
        hands,
        turn: (state.turn + state.direction + state.hands.length) % state.hands.length,
        suitToMatch: null,
        lastPlayer: current.playerId,
      };
    }

    const play = payload as { cardId: string; chosenSuit?: string };
    const cardIdx = current.cards.indexOf(play.cardId);
    current.cards.splice(cardIdx, 1);
    discardPile.push(play.cardId);

    const card = getCard(play.cardId);
    const suit = card.rank === '8' ? play.chosenSuit ?? null : null;

    return {
      ...state,
      deck,
      discardPile,
      hands,
      turn: (state.turn + state.direction + state.hands.length) % state.hands.length,
      suitToMatch: suit,
      lastPlayed: play.cardId,
      lastPlayer: current.playerId,
    };
  },

  isOver(state) {
    for (const h of state.hands) {
      if (h.cards.length === 0) {
        return {
          winner: h.playerId,
          reason: 'Emptied hand',
          pointsEarned: { [h.playerId]: 200 },
        };
      }
    }
    return null;
  },

  bot: crazyEightsBot,

  view(state, forPlayer) {
    // Hide opponents' cards
    const hands = state.hands.map((h) => {
      if (h.playerId === forPlayer) return h;
      return { ...h, cards: h.cards.map(() => '__hidden__') };
    });
    return { ...state, hands, deck: state.deck.map((_, index) => `__hidden_deck_${index}__`) };
  },

  path() {
    return null;
  },
};

function reshuffle(deck: string[], discardPile: string[]) {
  const top = discardPile.pop();
  if (!top) return;
  deck.push(...shuffle(discardPile));
  discardPile.length = 0;
  discardPile.push(top);
}

export { CrazyEightsBoard } from './CrazyEights';
export type { CrazyEightsState, CrazyEightsMove };