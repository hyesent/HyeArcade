import type { GameDefinition, Move, Player } from '../../core/types';
import type { GomokuState, PlaceMove, Stone } from './types';
import { findFive, isFull } from './logic';
import { gomokuBot } from './bot';

const SIZE = 15;

export const gomoku: GameDefinition<GomokuState, PlaceMove> = {
  id: 'gomoku',
  name: 'Gomoku',
  minPlayers: 2,
  maxPlayers: 2,

  icon: 'gomoku',
  color: '#4FD1A0',
  tags: ['board', 'strategy'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): GomokuState {
    return {
      size: SIZE,
      board: Array(SIZE * SIZE).fill(null),
      turn: 0,
      playerIds: [players[0].id, players[1].id],
      lastMove: null,
    };
  },

  currentPlayer(state) {
    return state.playerIds[state.turn];
  },

  legalMoves(state) {
    const player = state.playerIds[state.turn];
    const moves: Move<PlaceMove>[] = [];
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === null) {
        moves.push({
          type: 'place',
          player,
          payload: { index: i },
          ts: Date.now(),
        });
      }
    }
    return moves;
  },

  validate(state, move) {
    const i = move.payload.index;
    return i >= 0 && i < state.board.length && state.board[i] === null;
  },

  apply(state, move) {
    const board = [...state.board];
    const stone: Stone = state.turn === 0 ? 'B' : 'W';
    board[move.payload.index] = stone;

    return {
      ...state,
      board,
      turn: state.turn === 0 ? 1 : 0,
      lastMove: move.payload.index,
    };
  },

  isOver(state) {
    const win = findFive(state.board, state.size);
    if (win) {
      const winnerId =
        win.winner === 'B' ? state.playerIds[0] : state.playerIds[1];
      return {
        winner: winnerId,
        reason: 'Five in a row',
        pointsEarned: { [winnerId]: 200 },
      };
    }
    if (isFull(state.board)) {
      return {
        winner: null,
        reason: 'Board full',
        pointsEarned: {
          [state.playerIds[0]]: 40,
          [state.playerIds[1]]: 40,
        },
      };
    }
    return null;
  },

  bot: gomokuBot,
};

export { GomokuBoard } from './Gomoku';
export type { GomokuState, PlaceMove };