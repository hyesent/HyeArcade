import type { GameDefinition, Player } from '../../core/types';
import type { SnakeLadderState, RollMove, SeatState } from './types';
import { resolveMove } from './logic';
import { snakeLadderBot } from './bot';

const SEAT_COLORS = ['#FF9A3C', '#5FA8E8', '#4FD1A0', '#FF5C7A', '#8B7FE8', '#E8B95C'];

export const snakeLadder: GameDefinition<SnakeLadderState, RollMove> = {
  id: 'snake-ladder',
  name: 'Snake & Ladder',
  minPlayers: 2,
  maxPlayers: 4,

  icon: 'snake-ladder',
  color: '#5FD17A',
  tags: ['board', 'classic', 'family', 'quick'],

  supports: {
    bots: true,
    lan: true,
    passAndPlay: true,
  },

  setup(players: Player[]): SnakeLadderState {
    const seats: SeatState[] = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: SEAT_COLORS[i % SEAT_COLORS.length],
      position: 0,
      finished: false,
      rolls: 0,
    }));

    return {
      size: 100,
      players: seats,
      turn: 0,
      dice: null,
      lastRoll: null,
    };
  },

  currentPlayer(state) {
    return state.players[state.turn].id;
  },

  legalMoves(state) {
    const player = state.players[state.turn].id;
    return [
      {
        type: 'roll',
        player,
        payload: { value: 1 + Math.floor(Math.random() * 6) },
        ts: Date.now(),
      },
    ];
  },

  validate(state, move) {
    if (state.players[state.turn].finished) return false;
    const v = move.payload.value;
    return Number.isInteger(v) && v >= 1 && v <= 6;
  },

  apply(state, move) {
    const playerIdx = state.turn;
    const seat = state.players[playerIdx];
    // The host normalizes this to the authoritative die before dispatch.
    // Applying the recorded value makes history and replay deterministic.
    const roll = move.payload.value;

    const { next, blocked } = resolveMove(seat.position, roll);

    const updatedSeat: SeatState = {
      ...seat,
      position: next,
      finished: next === 100,
      rolls: seat.rolls + (blocked ? 0 : 1),
    };

    const players = state.players.map((p, i) =>
      i === playerIdx ? updatedSeat : p,
    );

    // If rolled a 6, same player goes again. Otherwise next seat.
    const nextTurn = roll === 6 && !updatedSeat.finished
      ? playerIdx
      : (playerIdx + 1) % state.players.length;

    return {
      ...state,
      players,
      turn: nextTurn,
      dice: roll,
      lastRoll: roll,
    };
  },

  isOver(state) {
    const winner = state.players.find((p) => p.finished);
    if (winner) {
      return {
        winner: winner.id,
        reason: 'Reached 100',
        pointsEarned: { [winner.id]: 200 },
        scores: Object.fromEntries(
          state.players.map((p) => [p.id, p.position]),
        ),
      };
    }
    return null;
  },

  bot: snakeLadderBot,

  path(state, move) {
    const seat = state.players[state.turn];
    const roll = move.payload.value;
    const { next, blocked } = resolveMove(seat.position, roll);

    const start = seat.position;
    const naturalLanding = blocked ? start : start + roll;
    const steps: { x: number; y: number; hop?: boolean }[] = [];

    // Walk forward only to the square the die actually lands on. Snakes and
    // ladders are a separate transfer; never animate a snake as a backwards walk.
    if (naturalLanding > start) {
      for (let p = start + 1; p <= naturalLanding; p += 1) {
        const cell = cellFromPosition(p);
        steps.push({ x: cell.col, y: cell.row, hop: true });
      }
    }
    if (!blocked && next !== naturalLanding) {
      const cell = cellFromPosition(next);
      steps.push({ x: cell.col, y: cell.row, hop: true });
    }

    const fromCell = cellFromPosition(start);
    const toCell = cellFromPosition(next);

    return {
      from: { x: fromCell.col, y: fromCell.row },
      to: { x: toCell.col, y: toCell.row },
      steps,
      style: 'hop',
      sound: 'piece-move',
      soundPerStep: true,
    };
  },
};

function cellFromPosition(pos: number): { row: number; col: number } {
  if (pos <= 0) return { row: 9, col: 0 }; // off board, parked at bottom-left
  const p = pos - 1;
  const row = 9 - Math.floor(p / 10);
  const inRow = p % 10;
  const col = Math.floor(p / 10) % 2 === 0 ? inRow : 9 - inRow;
  return { row, col };
}

export { SnakeLadderBoard } from './SnakeLadder';
export { SnakeLadderScreen } from './Screen';
export type { SnakeLadderState, RollMove };