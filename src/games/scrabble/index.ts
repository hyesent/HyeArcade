import type { GameDefinition } from '../../core/types';
import type { ScrabbleState, ScrabbleMove } from './logic';
import {
  scrabbleSetup,
  scrabbleCurrent,
  scrabbleLegalMoves,
  scrabbleValidate,
  scrabbleApply,
  scrabbleOver,
  scrabbleBot,
} from './logic';

export const scrabble: GameDefinition<ScrabbleState, ScrabbleMove> = {
  id: 'scrabble',
  name: 'Scrabble',
  minPlayers: 2,
  maxPlayers: 4,
  icon: 'scrabble',
  color: '#FF9A3C',
  tags: ['word', 'board', 'strategy', 'classic'],
  supports: { bots: true, lan: true, passAndPlay: true },
  setup: scrabbleSetup,
  currentPlayer: scrabbleCurrent,
  legalMoves: scrabbleLegalMoves,
  validate: scrabbleValidate,
  apply: scrabbleApply,
  isOver: scrabbleOver,
  bot: (state, player) => scrabbleBot(state, player),
  view(state, forPlayer) {
    return {
      ...state,
      racks: Object.fromEntries(state.playerIds.map((id) => [
        id,
        id === forPlayer
          ? [...(state.racks[id] ?? [])]
          : Array.from({ length: (state.racks[id] ?? []).length }, (_, index) => ({
              id: `hidden-${id}-${index}`,
              letter: '',
              value: 0,
            })),
      ])),
      bag: state.bag.map((_, index) => ({ id: `hidden-bag-${index}`, letter: '', value: 0 })),
    };
  },
};
