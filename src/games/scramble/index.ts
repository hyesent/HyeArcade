import type { GameDefinition } from '../../core/types';
import type { ScrambleState, ScrambleMove } from './types';
import { scrambleApply, scrambleBot, scrambleCurrent, scrambleLegalMoves, scrambleOver, scrambleSetup, scrambleValidate } from './logic';

export const scramble: GameDefinition<ScrambleState, ScrambleMove> = {
  id: 'scramble', name: 'Scramble', minPlayers: 1, maxPlayers: 4, icon: 'scramble', color: '#8B7FE8', tags: ['word', 'family', 'casual'],
  supports: { bots: true, lan: true, passAndPlay: true, solo: true },
  setup: scrambleSetup,
  currentPlayer: scrambleCurrent,
  legalMoves: scrambleLegalMoves,
  validate: scrambleValidate,
  apply: scrambleApply,
  isOver: scrambleOver,
  bot: (s, p) => scrambleBot(s, p),
  view(state) { return { ...state, current: { ...state.current, answer: '' } }; },
};
export type { ScrambleState, ScrambleMove } from './types';
