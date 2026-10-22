import type { GameDefinition, Move, Player } from '../../core/types';
import type { ConnectFourState, DropMove, Cell } from './types';
import { landingRow, findWin, isFull, idx } from './logic';
import { connectFourBot } from './bot';
export { ConnectFourScreen } from './Screen';

const COLS = 7;
const ROWS = 6;

export const connectFour: GameDefinition<ConnectFourState, DropMove> = {
  id: 'connect-four',
  name: 'Connect Four',
  minPlayers: 2,
  maxPlayers: 2,

  icon: 'connect-four',
  color: '#E8B95C',
  tags: ['board', 'classic', 'quick'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): ConnectFourState {
    return {
      cols: COLS,
      rows: ROWS,
      board: Array(COLS * ROWS).fill(null),
      turn: 0,
      playerIds: [players[0].id, players[1].id],
      lastDrop: null,
    };
  },

  currentPlayer(state) {
    return state.playerIds[state.turn];
  },

  legalMoves(state) {
    const player = state.playerIds[state.turn];
    const moves: Move<DropMove>[] = [];
    for (let c = 0; c < COLS; c++) {
      if (landingRow(state.board, COLS, ROWS, c) !== -1) {
        moves.push({
          type: 'drop',
          player,
          payload: { col: c },
          ts: Date.now(),
        });
      }
    }
    return moves;
  },

  validate(state, move) {
    const { col } = move.payload;
    if (col < 0 || col >= COLS) return false;
    return landingRow(state.board, COLS, ROWS, col) !== -1;
  },

  apply(state, move) {
    const { col } = move.payload;
    const r = landingRow(state.board, COLS, ROWS, col);
    const board = [...state.board];
    const cell: Cell = state.turn === 0 ? 'R' : 'Y';
    board[idx(r, col, COLS)] = cell;

    return {
      ...state,
      board,
      turn: state.turn === 0 ? 1 : 0,
      lastDrop: idx(r, col, COLS),
    };
  },

  isOver(state) {
    const win = findWin(state.board, COLS, ROWS, 4);
    if (win) {
      const winnerId =
        win.winner === 'R' ? state.playerIds[0] : state.playerIds[1];
      return {
        winner: winnerId,
        reason: 'Four in a row',
        pointsEarned: { [winnerId]: 150 },
      };
    }
    if (isFull(state.board)) {
      return {
        winner: null,
        reason: 'Draw',
        pointsEarned: {
          [state.playerIds[0]]: 30,
          [state.playerIds[1]]: 30,
        },
      };
    }
    return null;
  },

  bot: connectFourBot,

  path(state, move) {
    const col = move.payload.col;
    const r = landingRow(state.board, COLS, ROWS, col);
    if (r === -1) return null;
    const startRow = -1; // above the top
    return {
      from: { x: col, y: startRow },
      to: { x: col, y: r },
      steps: Array.from({ length: r - startRow + 1 }, (_, i) => ({
        x: col,
        y: startRow + i,
      })),
      style: 'descend',
      sound: 'piece-move',
    };
  },
};

export { ConnectFourBoard } from './ConnectFour';
export type { ConnectFourState, DropMove };