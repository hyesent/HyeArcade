import type { GameDefinition } from '../../core/types';
import type { MonopolyDealMove, MonopolyDealState } from './types';
import {
  mdApply,
  mdBot,
  mdCurrent,
  mdLegalMoves,
  mdOver,
  mdValidate,
  monopolyDealSetup,
} from './logic';

export const monopolyDeal: GameDefinition<MonopolyDealState, MonopolyDealMove> = {
  id: 'monopoly-deal',
  name: 'Monopoly Deal',
  minPlayers: 2,
  maxPlayers: 5,
  icon: 'monopoly-deal',
  color: '#65D6A0',
  tags: ['card', 'strategy', 'family'],
  supports: { bots: true, lan: true, passAndPlay: true },
  setup: monopolyDealSetup,
  currentPlayer: mdCurrent,
  legalMoves: mdLegalMoves,
  validate: mdValidate,
  apply: mdApply,
  isOver: mdOver,
  bot: (state, player) => mdBot(state, player),
  view(state, forPlayer) {
    return {
      ...state,
      hands: Object.fromEntries(state.playerIds.map((id) => [
        id,
        id === forPlayer
          ? [...(state.hands[id] ?? [])]
          : Array.from({ length: (state.hands[id] ?? []).length }, (_, index) => `__hidden_hand_${id}_${index}__`),
      ])),
      deck: state.deck.map((_, index) => `__hidden_deck_${index}__`),
    };
  },
};

export type { MonopolyDealState, MonopolyDealMove } from './types';
