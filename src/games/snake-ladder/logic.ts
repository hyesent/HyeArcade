import { SNAKES, LADDERS } from './types';

export function applySquare(pos: number): { position: number; effect: 'snake' | 'ladder' | null; from: number } {
  if (SNAKES[pos] !== undefined) {
    return { position: SNAKES[pos], effect: 'snake', from: pos };
  }
  if (LADDERS[pos] !== undefined) {
    return { position: LADDERS[pos], effect: 'ladder', from: pos };
  }
  return { position: pos, effect: null, from: pos };
}

// A player wins only by landing exactly on 100. Overshoot = no move.
export function resolveMove(current: number, roll: number): { next: number; blocked: boolean } {
  const target = current + roll;
  if (target > 100) return { next: current, blocked: true };
  const applied = applySquare(target);
  return { next: applied.position, blocked: false };
}