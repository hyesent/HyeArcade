import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { SnakeLadderState, RollMove } from './types';

// Snake & Ladder is pure luck — every difficulty rolls the same.
// But we keep the signature so all games behave the same way.
export function snakeLadderBot(
  _state: SnakeLadderState,
  player: PlayerId,
  _difficulty: BotDifficulty,
): Move<RollMove> {
  return {
    type: 'roll',
    player,
    payload: { value: 1 + Math.floor(Math.random() * 6) },
    ts: Date.now(),
  };
}