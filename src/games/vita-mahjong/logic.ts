import type { VitaTile } from './types';

/** A board tile is free when it is not covered and has an open long side.
 * Tiles already collected into the four-slot tray no longer participate in board blocking.
 */
export function isFree(tile: VitaTile, all: VitaTile[]): boolean {
  if (tile.removed || tile.inTray) return false;
  if (all.some(t => !t.removed && !t.inTray && t.layer === tile.layer + 1 && Math.abs(t.x - tile.x) < 1 && Math.abs(t.y - tile.y) < 1)) return false;
  const left = all.some(t => !t.removed && !t.inTray && t.layer === tile.layer && t.x === tile.x - 1 && Math.abs(t.y - tile.y) < 1);
  const right = all.some(t => !t.removed && !t.inTray && t.layer === tile.layer && t.x === tile.x + 1 && Math.abs(t.y - tile.y) < 1);
  return !left || !right;
}

export function canMatch(a: VitaTile, b: VitaTile): boolean {
  if (a.id === b.id || a.removed || b.removed) return false;
  if (a.suit === 'flower' && b.suit === 'flower') return true;
  if (a.suit === 'season' && b.suit === 'season') return true;
  return a.kind === b.kind;
}

export function findMatches(tiles: VitaTile[]): [string, string][] {
  const free = tiles.filter(t => isFree(t, tiles));
  const out: [string, string][] = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (canMatch(free[i], free[j])) out.push([free[i].id, free[j].id]);
    }
  }
  return out;
}

export function trayHasMatch(tile: VitaTile, tray: string[], tiles: VitaTile[]): string | null {
  for (const id of tray) {
    const other = tiles.find(t => t.id === id);
    if (other && canMatch(tile, other)) return id;
  }
  return null;
}

export function canEnterTray(tile: VitaTile, tray: string[], tiles: VitaTile[]): boolean {
  if (tray.length < 4) return true;
  return trayHasMatch(tile, tray, tiles) !== null;
}

export function isSolved(tiles: VitaTile[], tray: string[]): boolean {
  return tray.length === 0 && tiles.every(t => t.removed);
}
