import type { GameDefinition, Move, Player } from '../../core/types';
import type { WhotState, WhotMove, WhotShape } from './types';
import { buildWhotDeck, getWhotCard, canPlayWhot } from './deck';
import { whotBot } from './bot';

const START_HAND = 6;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const whot: GameDefinition<WhotState, WhotMove> = {
  id: 'whot',
  name: 'Whot',
  minPlayers: 2,
  maxPlayers: 6,

  icon: 'whot',
  color: '#FF5C7A',
  tags: ['card', 'classic', 'family'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): WhotState {
    const all = shuffle(buildWhotDeck()).map((c) => c.id);
    const hands = players.map((p) => ({
      playerId: p.id,
      cards: [] as string[],
    }));

    for (let i = 0; i < START_HAND; i++) {
      for (const h of hands) h.cards.push(all.pop()!);
    }

    // Flip a non-whot starter
    let starter = all.pop()!;
    while (starter.startsWith('whot-') && all.length > 0) {
      all.unshift(starter);
      starter = all.pop()!;
    }

    return {
      playerIds: players.map((p) => p.id),
      hands,
      deck: all,
      discardPile: [starter],
      turn: 0,
      marketCount: 0,
      requiredShape: null,
      lastPlayed: starter,
    };
  },

  currentPlayer(state) {
    return state.hands[state.turn].playerId;
  },

  legalMoves(state, player) {
    const hand = state.hands[state.turn];
    if (hand.playerId !== player) return [];
    const top = getWhotCard(state.discardPile[state.discardPile.length - 1]);

    const moves: Move<WhotMove>[] = [];
    for (const id of hand.cards) {
      const card = getWhotCard(id);
      if (!canPlayWhot(card, top, state.requiredShape, state.marketCount)) continue;
      if (card.shape === 'whot') {
        for (const s of ['circle', 'triangle', 'cross', 'square', 'star'] as WhotShape[]) {
          moves.push({
            type: 'play',
            player,
            payload: { cardId: id, requestedShape: s },
            ts: Date.now(),
          });
        }
      } else {
        moves.push({ type: 'play', player, payload: { cardId: id }, ts: Date.now() });
      }
    }
    moves.push({ type: 'play', player, payload: { type: 'market', count: state.marketCount > 0 ? state.marketCount : 1 }, ts: Date.now() });
    return moves;
  },

  validate(state, move) {
    const hand = state.hands[state.turn];
    const p = move.payload;
    if ('type' in p && p.type === 'market') {
      if (state.marketCount > 0) return true;
      const top = getWhotCard(state.discardPile[state.discardPile.length - 1]);
      const hasPlayable = hand.cards.some((id) =>
        canPlayWhot(getWhotCard(id), top, state.requiredShape, state.marketCount),
      );
      return !hasPlayable;
    }
    if ('type' in p && p.type === 'pass') return state.marketCount === 0;

    const play = p as { cardId: string; requestedShape?: WhotShape };
    if (!hand.cards.includes(play.cardId)) return false;
    const card = getWhotCard(play.cardId);
    if (!card) return false;
    if (card.shape === 'whot') {
      const requestedShapes: WhotShape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
      // A 20 must always include the shape the player called. Without it the
      // next turn would have no usable called-shape rule.
      if (!play.requestedShape || !requestedShapes.includes(play.requestedShape)) return false;
    }
    const top = getWhotCard(state.discardPile[state.discardPile.length - 1]);
    return canPlayWhot(card, top, state.requiredShape, state.marketCount);
  },

  apply(state, move) {
    const p = move.payload;
    const hands = state.hands.map((h) => ({ ...h, cards: [...h.cards] }));
    const current = hands[state.turn];
    const deck = [...state.deck];
    const discardPile = [...state.discardPile];

    if ('type' in p && p.type === 'market') {
      const draw = state.marketCount > 0 ? state.marketCount : 1;
      for (let i = 0; i < draw; i++) {
        if (deck.length === 0) reshuffle(deck, discardPile);
        if (deck.length > 0) current.cards.push(deck.pop()!);
      }
      return {
        ...state,
        deck,
        discardPile,
        hands,
        marketCount: 0,
        // A WHOT call remains active across a market draw. Otherwise the top
        // card is still a WHOT and the next player can only continue with 20s.
        requiredShape: state.requiredShape,
        turn: nextTurn(state),
      };
    }

    const play = p as { cardId: string; requestedShape?: WhotShape };
    current.cards = current.cards.filter((id) => id !== play.cardId);
    discardPile.push(play.cardId);
    const card = getWhotCard(play.cardId);

    let marketCount = state.marketCount;
    let requiredShape: WhotShape | null = null;
    let extraTurn = false;
    let skipCount = 0;
    let extraTurnFromMarket = false;

    if (card.shape === 'whot') {
      requiredShape = play.requestedShape ?? null;
    } else if (card.number === 2) {
      marketCount += 2;
    } else if (card.number === 5) {
      marketCount += 3;
    } else if (card.number === 1) {
      extraTurn = true;
    } else if (card.number === 8) {
      // Nigerian WHOT: 8 suspends the next player for one turn.
      skipCount = 1;
    } else if (card.number === 14) {
      // Nigerian General Market: every other player draws one; common digital
      // implementations keep the 14-player in control for another turn.
      for (let i = 0; i < hands.length; i++) {
        if (i === state.turn) continue;
        if (deck.length === 0) reshuffle(deck, discardPile);
        if (deck.length > 0) hands[i].cards.push(deck.pop()!);
      }
      extraTurnFromMarket = true;
    }

    // Check win
    if (current.cards.length === 0) {
      return {
        ...state,
        deck,
        discardPile,
        hands,
        lastPlayed: play.cardId,
      };
    }

    const nextTurnIdx = extraTurn || extraTurnFromMarket
      ? state.turn
      : ((state.turn + 1 + skipCount) % hands.length);

    return {
      ...state,
      deck,
      discardPile,
      hands,
      turn: nextTurnIdx,
      marketCount,
      requiredShape,
      lastPlayed: play.cardId,
    };
  },

  isOver(state) {
    for (const h of state.hands) {
      if (h.cards.length === 0) {
        return {
          winner: h.playerId,
          reason: 'Emptied hand',
          pointsEarned: Object.fromEntries(
            state.hands.filter(x => x.playerId !== h.playerId).map(x => [
              x.playerId,
              x.cards.reduce((sum, id) => {
                const c = getWhotCard(id);
                return sum + (c.shape === 'whot' ? 20 : c.shape === 'star' ? c.number * 2 : c.number);
              }, 0),
            ]),
          ),
        };
      }
    }
    return null;
  },

  bot: whotBot,

  view(state, forPlayer) {
    return {
      ...state,
      hands: state.hands.map((h) =>
        h.playerId === forPlayer
          ? h
          : { ...h, cards: h.cards.map(() => '__hidden__') },
      ),
      deck: state.deck.map((_, index) => `__hidden_deck_${index}__`),
    };
  },

  path() {
    return null;
  },
};

function nextTurn(state: WhotState): number {
  return (state.turn + 1) % state.hands.length;
}

function reshuffle(deck: string[], discardPile: string[]) {
  if (discardPile.length <= 1) return;
  const top = discardPile.pop()!;
  deck.push(...shuffle(discardPile));
  discardPile.length = 0;
  discardPile.push(top);
}

export { WhotBoard } from './Whot';
export type { WhotState, WhotMove };