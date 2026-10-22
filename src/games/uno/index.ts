import type { GameDefinition, Move, Player } from '../../core/types';
import type { UnoState, UnoMove, UnoColor } from './types';
import { buildUnoDeck, getUnoCard, canPlayUno } from './deck';
import { unoBot } from './bot';

const START_HAND = 7;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const uno: GameDefinition<UnoState, UnoMove> = {
  id: 'uno',
  name: 'UNO',
  minPlayers: 2,
  maxPlayers: 4,

  icon: 'uno',
  color: '#FF3B3B',
  tags: ['card', 'classic', 'family'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): UnoState {
    return createRound(players.map((p) => p.id), {}, 0, 1);
  },

  currentPlayer(state) {
    return state.hands[state.turn].playerId;
  },

  legalMoves(state, player) {
    const hand = state.hands[state.turn];
    if (hand.playerId !== player) return [];
    const top = getUnoCard(state.discardPile[state.discardPile.length - 1]);

    const moves: Move<UnoMove>[] = [];
    const candidateIds = state.drawnCardId ? [state.drawnCardId] : hand.cards;
    for (const id of candidateIds) {
      const card = getUnoCard(id);
      if (!card || !canPlayUno(card, top, state.activeColor, state.pendingDraw, hand.cards.map(getUnoCard))) continue;
      if (card.value === 'WILD' || card.value === 'WILD4') {
        for (const c of ['R', 'G', 'B', 'Y'] as UnoColor[]) {
          moves.push({
            type: 'play',
            player,
            payload: { cardId: id, chosenColor: c },
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
    if (state.wild4Challenge?.playerId === player) {
      moves.push({ type: 'play', player, payload: { type: 'challengeWild4' }, ts: Date.now() });
    }
    if (!state.drawnCardId) {
      moves.push({ type: 'play', player, payload: { type: 'draw' }, ts: Date.now() });
    }
    return moves;
  },

  validate(state, move) {
    const hand = state.hands[state.turn];
    const p = move.payload;

    if ('type' in p && p.type === 'draw') {
      if (state.drawnCardId) return false;
      return state.pendingDraw > 0 || state.deck.length > 0 || state.discardPile.length > 1;
    }
    if ('type' in p && p.type === 'callUno') {
      const targetId = p.targetPlayerId ?? move.player;
      const target = state.hands.find(h => h.playerId === targetId);
      if (!target || target.cards.length !== 1 || target.hasCalledUno) return false;
      return true;
    }
    if ('type' in p && p.type === 'challengeWild4') return state.wild4Challenge?.playerId === hand.playerId;
    if ('type' in p && p.type === 'pass') return !!state.drawnCardId;

    const play = p as { cardId: string; chosenColor?: UnoColor };
    if (!hand.cards.includes(play.cardId)) return false;
    if (state.drawnCardId && play.cardId !== state.drawnCardId) return false;
    const top = getUnoCard(state.discardPile[state.discardPile.length - 1]);
    const card = getUnoCard(play.cardId);
    if ((card.value === 'WILD' || card.value === 'WILD4') && !play.chosenColor) return false;
    return canPlayUno(card, top, state.activeColor, state.pendingDraw, hand.cards.map(getUnoCard));
  },

  apply(state, move) {
    const p = move.payload;
    const hands = state.hands.map((h) => ({ ...h, cards: [...h.cards] }));
    const current = hands[state.turn];
    const deck = [...state.deck];
    const discardPile = [...state.discardPile];

    if ('type' in p && p.type === 'challengeWild4') {
      const challenge = state.wild4Challenge;
      if (!challenge) return state;
      const offender = hands.find((h) => h.playerId === challenge.playerId);
      if (!offender) return state;
      const guilty = offender.cards.some((id) => getUnoCard(id)?.color === challenge.previousColor);
      const drawCount = guilty ? 4 : 6;
      const target = guilty ? offender : current;
      for (let i = 0; i < drawCount; i++) {
        if (deck.length === 0) reshuffle(deck, discardPile);
        if (deck.length > 0) target.cards.push(deck.pop()!);
      }
      return {
        ...state, deck, discardPile, hands,
        turn: guilty ? state.turn : nextTurn(state),
        pendingDraw: 0, drawnCardId: null, wild4Challenge: null,
      };
    }

    if ('type' in p && p.type === 'draw') {
      if (state.pendingDraw > 0) {
        // Classic UNO: draw the penalty and lose the turn; draw penalties do not stack.
        for (let i = 0; i < state.pendingDraw; i++) {
          if (deck.length === 0) reshuffle(deck, discardPile);
          if (deck.length > 0) current.cards.push(deck.pop()!);
        }
        return { ...state, deck, discardPile, hands, turn: nextTurn(state), pendingDraw: 0, drawnCardId: null };
      }

      if (deck.length === 0) reshuffle(deck, discardPile);
      const drawn = deck.pop();
      if (!drawn) return { ...state, turn: nextTurn(state), drawnCardId: null };
      current.cards.push(drawn);
      const drawnCard = getUnoCard(drawn);
      const topCard = getUnoCard(discardPile[discardPile.length - 1]);
      const playable = canPlayUno(drawnCard, topCard, state.activeColor, 0, current.cards.map(getUnoCard));
      // Official flow permits the drawn card to be played immediately if it is legal.
      return playable
        ? { ...state, deck, discardPile, hands, drawnCardId: drawn }
        : { ...state, deck, discardPile, hands, turn: nextTurn(state), drawnCardId: null };
    }

    if ('type' in p && p.type === 'callUno') {
      const targetId = p.targetPlayerId ?? move.player;
      const target = hands.find(h => h.playerId === targetId);
      if (!target || target.cards.length !== 1 || target.hasCalledUno) return state;
      if (target.playerId === move.player) {
        target.hasCalledUno = true;
        return { ...state, hands, deck: state.deck.map((_, index) => `__hidden_deck_${index}__`) };
      }
      for (let i = 0; i < 2; i++) {
        if (deck.length === 0) reshuffle(deck, discardPile);
        if (deck.length > 0) target.cards.push(deck.pop()!);
      }
      return { ...state, deck, discardPile, hands };
    }

    if ('type' in p && p.type === 'pass') {
      return { ...state, hands, turn: nextTurn(state), drawnCardId: null };
    }

    const play = p as { cardId: string; chosenColor?: UnoColor };
    const playedIndex = current.cards.indexOf(play.cardId);
    if (playedIndex < 0) return state;
    current.cards.splice(playedIndex, 1);
    discardPile.push(play.cardId);
    // Reaching one card never auto-calls UNO. The player must explicitly call it.
    // A player who has moved away from one card no longer carries the prior call state.
    current.hasCalledUno = current.cards.length === 1 ? false : false;
    const card = getUnoCard(play.cardId);

    let activeColor: UnoColor = card.color;
    let pendingDraw = state.pendingDraw;
    let direction = state.direction;
    let skip = false;

    if (card.value === 'WILD' || card.value === 'WILD4') {
      activeColor = play.chosenColor ?? 'R';
      if (card.value === 'WILD4') pendingDraw = 4;
    } else if (card.value === 'DRAW2') {
      pendingDraw = 2;
    } else if (card.value === 'SKIP') {
      skip = true;
    } else if (card.value === 'REV') {
      if (hands.length === 2) skip = true;
      else direction = (direction * -1) as 1 | -1;
    }

    if (current.cards.length === 0) {
      // A final Draw 4 is still resolved before the round is scored.
      if (card.value === 'WILD4') {
        const forced = (state.turn + direction + hands.length) % hands.length;
        for (let i = 0; i < 4; i++) {
          if (deck.length === 0) reshuffle(deck, discardPile);
          if (deck.length > 0) hands[forced].cards.push(deck.pop()!);
        }
      }
      return finishRound({
        ...state, deck, discardPile, hands, activeColor, pendingDraw: 0,
        lastPlayed: play.cardId, drawnCardId: null, wild4Challenge: null,
      });
    }

    let nextIdx = state.turn;
    if (skip) {
      nextIdx = (nextIdx + direction + hands.length) % hands.length;
      nextIdx = (nextIdx + direction + hands.length) % hands.length;
    } else {
      nextIdx = (nextIdx + direction + hands.length) % hands.length;
    }

    return {
      ...state, deck, discardPile, hands, turn: nextIdx, direction, activeColor,
      pendingDraw, lastPlayed: play.cardId, drawnCardId: null,
      wild4Challenge: card.value === 'WILD4'
        ? { playerId: current.playerId, previousColor: state.activeColor }
        : null,
    };
  },

  isOver(state) {
    if (!state.matchWinner) return null;
    const score = state.scores[state.matchWinner] ?? 0;
    return {
      winner: state.matchWinner,
      reason: `First to ${score} points after ${state.round} rounds`,
      scores: state.scores,
      pointsEarned: { [state.matchWinner]: score },
    };
  },

  bot: unoBot,

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

function createRound(
  playerIds: string[],
  scores: Record<string, number>,
  roundStarter: number,
  round: number,
): UnoState {
  const all = shuffle(buildUnoDeck()).map((c) => c.id);
  const hands = playerIds.map((playerId) => ({ playerId, cards: [] as string[], hasCalledUno: false }));
  for (let i = 0; i < START_HAND; i++) for (const h of hands) h.cards.push(all.pop()!);
  let starter = all.pop()!;
  // Keep Wild/Wild Draw Four out of the initial discard. Number/action cards are allowed;
  // their opening effect is resolved below so the first turn follows UNO's setup rules.
  while (getUnoCard(starter).value === 'WILD' || getUnoCard(starter).value === 'WILD4') {
    all.unshift(starter);
    starter = all.pop()!;
  }
  const starterCard = getUnoCard(starter);
  let firstTurn = roundStarter % playerIds.length;
  let firstDirection: 1 | -1 = 1;
  let firstPendingDraw = 0;
  if (starterCard.value === 'SKIP') {
    firstTurn = (firstTurn + 1) % playerIds.length;
  } else if (starterCard.value === 'REV') {
    if (playerIds.length === 2) firstTurn = (firstTurn + 1) % playerIds.length;
    else { firstDirection = -1; firstTurn = (firstTurn - 1 + playerIds.length) % playerIds.length; }
  } else if (starterCard.value === 'DRAW2') {
    firstPendingDraw = 2;
  }
  return {
    playerIds, hands, deck: all, discardPile: [starter],
    turn: firstTurn, direction: firstDirection,
    activeColor: starterCard.color, pendingDraw: firstPendingDraw,
    lastPlayed: starter, drawnCardId: null, scores: { ...scores },
    round, roundStarter: roundStarter % playerIds.length,
    matchWinner: null, wild4Challenge: null,
  };
}

function finishRound(state: UnoState): UnoState {
  const winner = state.hands.find((h) => h.cards.length === 0);
  if (!winner) return state;
  const points = state.hands
    .filter((h) => h.playerId !== winner.playerId)
    .reduce((sum, h) => sum + h.cards.reduce((cardSum, id) => {
      const c = getUnoCard(id);
      if (!c) return cardSum;
      if (/^[0-9]$/.test(c.value)) return cardSum + Number(c.value);
      return cardSum + (c.value === 'DRAW2' || c.value === 'SKIP' || c.value === 'REV' ? 20 : 50);
    }, 0), 0);
  const scores = { ...state.scores, [winner.playerId]: (state.scores[winner.playerId] ?? 0) + points };
  if (scores[winner.playerId] >= 500) return { ...state, scores, matchWinner: winner.playerId };
  const nextStarter = (state.roundStarter + 1) % state.playerIds.length;
  return createRound(state.playerIds, scores, nextStarter, state.round + 1);
}

function nextTurn(state: UnoState): number {
  return (state.turn + state.direction + state.hands.length) % state.hands.length;
}

function reshuffle(deck: string[], discardPile: string[]) {
  if (discardPile.length <= 1) return;
  const top = discardPile.pop()!;
  deck.push(...shuffle(discardPile));
  discardPile.length = 0;
  discardPile.push(top);
}

export { UnoBoard } from './Uno';
export type { UnoState, UnoMove };