import type { GameDefinition, Player } from '../../core/types';
import type { TicTacToeState, PlaceMove } from './types';
import { emptyIndices, getWinner, isDraw } from './logic';
import { ticTacToeBot } from './bot';

export const ticTacToe: GameDefinition<TicTacToeState, PlaceMove> = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  minPlayers: 2,
  maxPlayers: 2,

  icon: 'tic-tac-toe',
  color: '#FF6B9D',
  tags: ['board', 'classic', 'quick'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): TicTacToeState {
    return {
      board: Array(9).fill(null),
      turn: 0,
      playerIds: [players[0].id, players[1].id],
    };
  },

  currentPlayer(state) {
    return state.playerIds[state.turn];
  },

  legalMoves(state) {
    const player = state.playerIds[state.turn];
    return emptyIndices(state.board).map((index) => ({
      type: 'place',
      player,
      payload: { index },
      ts: Date.now(),
    }));
  },

  validate(state, move) {
    return state.board[move.payload.index] === null;
  },

  apply(state, move) {
    const board = [...state.board];
    board[move.payload.index] = state.turn === 0 ? 'X' : 'O';
    return {
      ...state,
      board,
      turn: state.turn === 0 ? 1 : 0,
    };
  },

  isOver(state) {
    const win = getWinner(state.board);
    if (win) {
      const winnerId = win.winner === 'X' ? state.playerIds[0] : state.playerIds[1];
      return {
        winner: winnerId,
        reason: 'Three in a row',
        pointsEarned: { [winnerId]: 100 },
      };
    }
    if (isDraw(state.board)) {
      return {
        winner: null,
        reason: 'Draw',
        pointsEarned: {
          [state.playerIds[0]]: 25,
          [state.playerIds[1]]: 25,
        },
      };
    }
    return null;
  },

  bot: ticTacToeBot,

  path() {
    return null;
  },
};

export type { TicTacToeState, PlaceMove };
export { TicTacToeBoard } from './TicTacToe';