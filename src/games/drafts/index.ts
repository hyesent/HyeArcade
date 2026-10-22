import type { GameDefinition, Player } from '../../core/types';
import type { CheckersState, CheckersMove } from '../checkers/types';
import {
  setupBoard,
  legalMovesFor,
  applyMoveToBoard,
  hasMoves,
  jumpsFor,
} from '../checkers/logic';
import { checkersBot } from '../checkers/bot';

export const drafts: GameDefinition<CheckersState, CheckersMove> = {
  id: 'drafts',
  name: 'Drafts',
  minPlayers: 2,
  maxPlayers: 2,

  icon: 'drafts',
  color: '#8B7FE8',
  tags: ['board', 'classic', 'strategy'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): CheckersState {
    return {
      size: 10,
      board: setupBoard(10),
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
    const wasCapture = move.payload.captured !== null;
    const promoted = landed === 'R' || landed === 'B';
    const moreCaptures = wasCapture && !promoted && jumpsFor(board, move.payload.to, state.size).length > 0;
    return {
      ...state, board,
      turn: moreCaptures ? state.turn : (state.turn === 0 ? 1 : 0),
      lastMove: move.payload,
      forcedFrom: moreCaptures ? move.payload.to : null,
    };
  },

  isOver(state) {
    if (state.forcedFrom !== null) return null;
    const nextTurn = state.turn === 0 ? 1 : 0;
    if (!hasMoves(state, nextTurn)) {
      const winnerId = state.playerIds[state.turn];
      return {
        winner: winnerId,
        reason: 'Opponent has no moves',
        pointsEarned: { [winnerId]: 280 },
      };
    }
    const theirPieces = state.board.filter((c) => {
      if (!c) return false;
      const isRed = c === 'r' || c === 'R';
      return nextTurn === 0 ? isRed : !isRed;
    });
    if (theirPieces.length === 0) {
      const winnerId = state.playerIds[state.turn];
      return {
        winner: winnerId,
        reason: 'All pieces captured',
        pointsEarned: { [winnerId]: 350 },
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

export { CheckersBoard as DraftsBoard } from '../checkers/Checkers';
export type { CheckersState as DraftsState, CheckersMove as DraftsMove };