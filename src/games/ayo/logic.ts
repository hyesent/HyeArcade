import type { AyoState } from './types';

export const AYO_PITS = 12;
export const AYO_START_SEEDS = 4;
export function playerPitIndices(player: 0 | 1): number[] {
  return player === 0 ? [6, 7, 8, 9, 10, 11] : [5, 4, 3, 2, 1, 0];
}
export function isPlayersPit(index: number, player: 0 | 1): boolean {
  return player === 0 ? index >= 6 && index <= 11 : index >= 0 && index <= 5;
}
export function legalAyoPits(state: AyoState, player: 0 | 1 = state.turn): number[] {
  const own = playerPitIndices(player).filter(i => state.pits[i] > 0);
  if (!own.length) return [];
  const opponentHasSeeds = state.pits.some((n, i) => !isPlayersPit(i, player) && n > 0);
  if (opponentHasSeeds) return own;
  const feeding = own.filter(pit => {
    const next = [...state.pits];
    sow(next, pit);
    return next.some((n, i) => !isPlayersPit(i, player) && n > 0);
  });
  return feeding;
}
function sow(pits: number[], start: number): number {
  let seeds = pits[start];
  pits[start] = 0;
  let at = start;
  while (seeds > 0) {
    at = (at + 1) % AYO_PITS;
    if (at === start) continue;
    pits[at] += 1;
    seeds -= 1;
  }
  return at;
}
export function applyAyoMove(state: AyoState, pit: number): AyoState {
  if (!legalAyoPits(state).includes(pit)) return state;
  const pits = [...state.pits];
  const last = sow(pits, pit);
  const captured: [number, number] = [state.captured[0], state.captured[1]];
  // Ayoayo capture variant: capture a chain of opponent pits holding 2 or 3 seeds,
  // beginning with the final pit. The chain runs backwards through opponent pits only.
  if (!isPlayersPit(last, state.turn) && (pits[last] === 2 || pits[last] === 3)) {
    let at = last;
    while (!isPlayersPit(at, state.turn) && (pits[at] === 2 || pits[at] === 3)) {
      captured[state.turn] += pits[at];
      pits[at] = 0;
      at = (at + AYO_PITS - 1) % AYO_PITS;
    }
  }
  const nextTurn = (state.turn === 0 ? 1 : 0) as 0 | 1;
  const next: AyoState = { ...state, pits, captured, moves: state.moves + 1, lastPit: last, turn: nextTurn, repetitions: { ...state.repetitions } };
  const positionKey = `${pits.join(',')}|${captured[0]}|${captured[1]}|${nextTurn}`;
  next.repetitions[positionKey] = (next.repetitions[positionKey] ?? 0) + 1;
  if (next.repetitions[positionKey] >= 3) return { ...next, draw: true };
  const nextHasMove = legalAyoPits(next).length > 0;
  if (!nextHasMove) {
    const remaining = pits.reduce((sum, n) => sum + n, 0);
    if (remaining) {
      // If the next player cannot make a legal feeding move, the previous mover takes every seed left on the board.
      const winner = remaining;
      captured[state.turn] += winner;
      for (let i = 0; i < pits.length; i++) pits[i] = 0;
      return { ...next, pits, captured, turn: state.turn };
    }
  }
  return next;
}
export function ayoResult(state: AyoState): { winner: string | null; reason: string; scores: Record<string, number> } | null {
  if (!state.draw && legalAyoPits(state).length > 0) return null;
  const total0 = state.captured[0] + state.pits.reduce((sum, n, i) => sum + (isPlayersPit(i, 0) ? n : 0), 0);
  const total1 = state.captured[1] + state.pits.reduce((sum, n, i) => sum + (isPlayersPit(i, 1) ? n : 0), 0);
  return { winner: state.draw || total0 === total1 ? null : total0 > total1 ? state.playerIds[0] : state.playerIds[1], reason: state.draw ? 'Repeated position — draw' : 'Most seeds captured', scores: { [state.playerIds[0]]: total0, [state.playerIds[1]]: total1 } };
}
