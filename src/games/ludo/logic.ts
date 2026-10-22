import type { Color, Pawn, LudoState } from './types';
import {
  RING_LENGTH,
  START_STEP,
  SAFE_SQUARES,
  FINISH_STEP,
} from './types';

export function ringPos(color: Color, step: number): number {
  return (START_STEP[color] + step) % RING_LENGTH;
}

export function nextStep(pawn: Pawn, value: number): number | null {
  if (pawn.state === 'yard') {
    return value === 6 ? 0 : null;
  }
  if (pawn.state === 'finished') return null;

  const next = pawn.step + value;
  if (next > FINISH_STEP) return null;
  return next;
}

export function sameRingCell(a: Pawn, b: Pawn): boolean {
  if (a.state !== 'ring' || b.state !== 'ring') return false;
  return ringPos(a.color, a.step) === ringPos(b.color, b.step);
}

export function isSafe(pawn: Pawn): boolean {
  if (pawn.state !== 'ring') return true;
  return SAFE_SQUARES.has(ringPos(pawn.color, pawn.step));
}

export function captures(mover: Pawn, allPawns: Pawn[]): Pawn[] {
  if (mover.state !== 'ring') return [];
  if (isSafe(mover)) return [];
  return allPawns.filter(
    (p) =>
      p.color !== mover.color &&
      p.state === 'ring' &&
      ringPos(p.color, p.step) === ringPos(mover.color, mover.step) &&
      !isSafe(p),
  );
}

export function legalPawnIndices(state: LudoState, dice: number): number[] {
  const color = state.colors[state.turn];
  const indices: number[] = [];

  state.pawns.forEach((p, i) => {
    if (p.color !== color) return;
    const ns = nextStep(p, dice);
    if (ns !== null) indices.push(i);
  });

  return indices;
}

export function hasWon(state: LudoState, color: Color): boolean {
  return state.pawns
    .filter((p) => p.color === color)
    .every((p) => p.state === 'finished');
}