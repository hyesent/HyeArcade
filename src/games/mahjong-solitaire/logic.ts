import type { Tile } from './types';
import { canMatchKinds, findAnyMatch as findLayoutMatch, isFreeSlot } from './layout';

export function isFree(tile: Tile, all: Tile[]): boolean {
  if (tile.removed) return false;
  const live = all.filter(t => !t.removed);
  return isFreeSlot(tile, live);
}
export function canMatch(a: Tile, b: Tile): boolean {
  if (a.id === b.id || a.removed || b.removed) return false;
  return canMatchKinds(a.kind, b.kind);
}
export function findAnyMatch(tiles: Tile[]): [string, string] | null {
  return findLayoutMatch(tiles);
}
export function isSolved(tiles: Tile[]): boolean { return tiles.every(t => t.removed); }
