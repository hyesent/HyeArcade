import type { GameDefinition, Player } from '../../core/types';
import type { CheckersState, CheckersMove } from './types';
import {
  setupBoard,
  legalMovesFor,
  applyMoveToBoard,
  hasMoves,
  jumpsFor,
} from './logic';
import { checkersBot } from './bot';


function __hasJumpFrom(board: CheckersState['board'], from: number, size: number): boolean {
  return jumpsFor(board, from, size).length > 0;
}

export const checkers: GameDefinition<CheckersState, CheckersMove> = {
  id: 'checkers',
  name: 'Checkers',
  minPlayers: 2,
  maxPlayers: 2,

  icon: 'checkers',
  color: '#5FA8E8',
  tags: ['board', 'classic', 'strategy'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): CheckersState {
    return {
      size: 8,
      board: setupBoard(8),
      turn: 0,
      playerIds: [players[0].id, players[1].id],
      lastMove: null,
      forcedFrom: null,
    };
  },

  currentPlayer(state) {
    return state.playerIds[state.turn];
  },

  legalMoves(state) {
    const player = state.playerIds[state.turn];
    return legalMovesFor(state, state.turn).map((m) => ({
      type: 'move',
      player,
      payload: m,
      ts: Date.now(),
    }));
  },

  validate(state, move) {
    const legal = legalMovesFor(state, state.turn);
    return legal.some(
      (m) => m.from === move.payload.from && m.to === move.payload.to && m.captured === move.payload.captured,
    );
  },

  apply(state, move) {
    const board = applyMoveToBoard(state.board, move.payload, state.size);
    const landed = board[move.payload.to];
    const wasJump = move.payload.captured !== null;
    const promoted = landed === 'R' || landed === 'B';
    const moreJumps = wasJump && !promoted
      ? __hasJumpFrom(board, move.payload.to, state.size)
      : false;

    return {
      ...state,
      board,
      turn: moreJumps ? state.turn : (state.turn === 0 ? 1 : 0),
      lastMove: move.payload,
      forcedFrom: moreJumps ? move.payload.to : null,
    };
  },

  isOver(state) {
    if (state.forcedFrom !== null) return null;
    const currentTurn = state.turn;
    const nextTurn = currentTurn === 0 ? 1 : 0;
    // The player whose turn it is loses when they have no legal move.
    if (!hasMoves(state, currentTurn)) {
      const winnerId = state.playerIds[nextTurn];
      return {
        winner: winnerId,
        reason: 'Opponent has no moves',
        pointsEarned: { [winnerId]: 250 },
      };
    }

    const currentPieces = state.board.filter((cell) => {
      if (!cell) return false;
      const isRed = cell === 'r' || cell === 'R';
      return currentTurn === 0 ? isRed : !isRed;
    });
    if (currentPieces.length === 0) {
      const winnerId = state.playerIds[nextTurn];
      return {
        winner: winnerId,
        reason: 'All pieces captured',
        pointsEarned: { [winnerId]: 300 },
      };
    }

    return null;
  },

  bot: checkersBot,

  path(state, move) {
    const m = move.payload;
    const size = state.size;
    const fromRow = Math.floor(m.from / size);
    const fromCol = m.from % size;
    const toRow = Math.floor(m.to / size);
    const toCol = m.to % size;

    return {
      from: { x: fromCol, y: fromRow },
      to: { x: toCol, y: toRow },
      steps: [
        { x: fromCol, y: fromRow },
        { x: toCol, y: toRow },
      ],
      style: 'slide',
      sound: m.captured !== null ? 'piece-capture' : 'piece-move',
    };
  },
};

export { CheckersBoard } from './Checkers';
export type { CheckersState, CheckersMove };