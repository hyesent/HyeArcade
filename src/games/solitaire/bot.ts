import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { SolitaireState, SolitaireMove } from './types';

export function solitaireBot(
  _state: SolitaireState,
  player: PlayerId,
  _difficulty: BotDifficulty,
): Move<SolitaireMove> {
  return {
    type: 'play',
    player,
    payload: { type: 'draw' },
    ts: Date.now(),
  };
}