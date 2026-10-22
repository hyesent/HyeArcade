import type { GameDefinition } from '../../core/types';
import type { MahjongState, MahjongMove } from './logic';
import {
  mahjongSetup,
  mahjongCurrent,
  mahjongLegalMoves,
  mahjongValidate,
  mahjongApply,
  mahjongOver,
  mahjongBot,
} from './logic';

export const mahjong: GameDefinition<MahjongState, MahjongMove> = {
  id: 'mahjong',
  name: 'Mahjong',
  minPlayers: 4,
  maxPlayers: 4,
  icon: 'mahjong',
  color: '#4FD1A0',
  tags: ['tile', 'strategy', 'classic'],
  supports: { bots: true, lan: true, passAndPlay: true },
  setup: mahjongSetup,
  currentPlayer: mahjongCurrent,
  legalMoves: mahjongLegalMoves,
  validate: mahjongValidate,
  apply: mahjongApply,
  isOver: mahjongOver,
  bot: (state, player) => mahjongBot(state, player),
  view(state, forPlayer) {
    return {
      ...state,
      hands: Object.fromEntries(state.playerIds.map((id) => [
        id,
        id === forPlayer
          ? [...(state.hands[id] ?? [])]
          : Array.from({ length: (state.hands[id] ?? []).length }, (_, index) => ({
              id: `hidden-${id}-${index}`,
              kind: 'hidden',
            })),
      ])),
      wall: state.wall.map((_, index) => ({ id: `hidden-wall-${index}`, kind: 'hidden' })),
      deadWall: state.deadWall.map((_, index) => ({ id: `hidden-dead-wall-${index}`, kind: 'hidden' })),
    };
  },
};
