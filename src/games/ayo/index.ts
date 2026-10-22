import type { GameDefinition, Move, Player } from '../../core/types';
import type { AyoState, AyoMove } from './types';
import { applyAyoMove, ayoResult, legalAyoPits } from './logic';

export const ayo: GameDefinition<AyoState, AyoMove> = {
  id: 'ayo', name: 'Ayo Ọlọ́pọ́n', minPlayers: 2, maxPlayers: 2,
  icon: 'ayo', color: '#C69A58', tags: ['board', 'strategy', 'traditional', 'Nigeria'],
  supports: { bots: true, lan: true, passAndPlay: true },
  setup(players: Player[]): AyoState { return { pits: Array(12).fill(4), playerIds: [players[0].id, players[1].id], turn: 0, captured: [0, 0], moves: 0, lastPit: null, repetitions: { [`${Array(12).fill(4).join(',')}|0|0|0`]: 1 }, draw: false }; },
  currentPlayer(state) { return state.playerIds[state.turn]; },
  legalMoves(state, player) {
    if (player !== state.playerIds[state.turn] || ayoResult(state)) return [];
    return legalAyoPits(state).map(pit => ({ type: 'sow', player, payload: { pit }, ts: Date.now() }));
  },
  validate(state, move: Move<AyoMove>) { return move.player === state.playerIds[state.turn] && legalAyoPits(state).includes(move.payload.pit); },
  apply(state, move: Move<AyoMove>) { return applyAyoMove(state, move.payload.pit); },
  isOver(state) { return ayoResult(state); },
  bot(state, player) {
    const legal = legalAyoPits(state);
    const pit = legal.reduce((best, p) => state.pits[p] > state.pits[best] ? p : best, legal[0] ?? 6);
    return { type: 'sow', player, payload: { pit }, ts: Date.now() };
  },
};
export type { AyoState, AyoMove } from './types';
