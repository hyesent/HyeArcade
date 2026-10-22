import type { Tile, TileSuit } from './types';

type Slot = { x: number; y: number; layer: number };

// Canonical Turtle layout: 87 + 36 + 16 + 4 + 1 = 144.
// Half-grid positions are intentional: they model the real staggered head/tail/cap.
const TURTLE_ROWS: [number, number, number, number][] = [
  [0, 0, 1, 12],
  [0, 1, 3, 8],
  [0, 2, 2, 10],
  [0, 3, 1, 12],
  [0, 4, 1, 12],
  [0, 5, 2, 10],
  [0, 6, 3, 8],
  [0, 7, 1, 12],
  [1, 1, 4, 6], [1, 2, 4, 6], [1, 3, 4, 6],
  [1, 4, 4, 6], [1, 5, 4, 6], [1, 6, 4, 6],
  [2, 2, 5, 4], [2, 3, 5, 4], [2, 4, 5, 4], [2, 5, 5, 4],
];
const TURTLE_EXTRA: Slot[] = [
  { x: 0, y: 3.5, layer: 0 },
  { x: 13, y: 3.5, layer: 0 },
  { x: 14, y: 3.5, layer: 0 },
  // Canonical cap: four tiles on layer 3, then one tile on layer 4.
  { x: 5.5, y: 3.5, layer: 3 },
  { x: 6.5, y: 3.5, layer: 3 },
  { x: 7.5, y: 3.5, layer: 3 },
  { x: 8.5, y: 3.5, layer: 3 },
  { x: 7, y: 3.5, layer: 4 },
];
export const SLOTS: Slot[] = [
  ...TURTLE_ROWS.flatMap(([layer, y, xStart, count]) =>
    Array.from({ length: count }, (_, i) => ({ x: xStart + i, y, layer }))
  ),
  ...TURTLE_EXTRA,
];

const KINDS: { kind: string; suit: TileSuit; label: string }[] = [];
for (const [suit, glyph] of [['bam', '🎋'], ['cir', '●'], ['chr', '萬']] as const) {
  for (let i = 1; i <= 9; i++) KINDS.push({ kind: `${suit}-${i}`, suit, label: `${glyph}${i}` });
}
for (const w of ['E', 'S', 'W', 'N']) KINDS.push({ kind: `wind-${w}`, suit: 'wind', label: w });
for (const d of ['R', 'G', 'W']) KINDS.push({ kind: `dragon-${d}`, suit: 'dragon', label: d });
for (const f of ['🌸', '🌺', '🌼', '🌻']) KINDS.push({ kind: `flower-${f}`, suit: 'flower', label: f });
for (const s of ['🌱', '☀️', '🍂', '❄️']) KINDS.push({ kind: `season-${s}`, suit: 'season', label: s });

export function matchKey(kind: string): string {
  if (kind.startsWith('flower-')) return 'flower';
  if (kind.startsWith('season-')) return 'season';
  return kind;
}
export function canMatchKinds(a: string, b: string): boolean {
  return matchKey(a) === matchKey(b);
}

export function isFreeSlot(tile: Slot, all: Slot[]): boolean {
  const covered = all.some(t => t.layer === tile.layer + 1 && Math.abs(t.x - tile.x) < 1 && Math.abs(t.y - tile.y) < 1);
  if (covered) return false;
  const left = all.some(t => t.layer === tile.layer && t.x === tile.x - 1 && Math.abs(t.y - tile.y) < 1);
  const right = all.some(t => t.layer === tile.layer && t.x === tile.x + 1 && Math.abs(t.y - tile.y) < 1);
  return !left || !right;
}

function pairPool(seed: number): string[][] {
  const pairs: string[][] = [];
  for (const k of KINDS.filter(k => k.suit !== 'flower' && k.suit !== 'season')) {
    pairs.push([k.kind, k.kind], [k.kind, k.kind]);
  }
  const flowers = shuffle(KINDS.filter(k => k.suit === 'flower').map(k => k.kind), seed ^ 0x51f15e);
  const seasons = shuffle(KINDS.filter(k => k.suit === 'season').map(k => k.kind), seed ^ 0x7a91ce);
  pairs.push([flowers[0], flowers[1]], [flowers[2], flowers[3]]);
  pairs.push([seasons[0], seasons[1]], [seasons[2], seasons[3]]);
  return shuffle(pairs, seed ^ 0x9e3779b9);
}

function generateSolvable(seed: number): { slots: Slot[]; kinds: string[] } {
  for (let attempt = 0; attempt < 500; attempt++) {
    const baseSeed = seed + attempt * 0x45d9f3;
    const active = SLOTS.map(s => ({ ...s }));
    const assigned = new Map<string, string>();
    const pairs = pairPool(baseSeed);
    let ok = true;
    for (let i = 0; i < pairs.length; i++) {
      const free = active.filter(s => isFreeSlot(s, active));
      if (free.length < 2) { ok = false; break; }
      const a = free[randInt(free.length, baseSeed + i * 977)];
      const rest = free.filter(s => s !== a);
      const b = rest[randInt(rest.length, baseSeed ^ (i * 2654435761))];
      assigned.set(slotKey(a), pairs[i][0]);
      assigned.set(slotKey(b), pairs[i][1]);
      removeSlot(active, a); removeSlot(active, b);
    }
    if (!ok || active.length) continue;
    return { slots: SLOTS.map(s => ({ ...s })), kinds: SLOTS.map(s => assigned.get(slotKey(s))!) };
  }
  throw new Error('Mahjong Solitaire could not generate a solvable Turtle deal');
}

export function buildTiles(seed = Date.now()): Tile[] {
  const generated = generateSolvable(seed);
  return generated.slots.map((slot, i) => {
    const kind = generated.kinds[i];
    const meta = KINDS.find(k => k.kind === kind)!;
    return { id: `t-${i}`, ...meta, ...slot, removed: false };
  });
}

export function shuffleTiles(tiles: Tile[], seed = Date.now()): Tile[] {
  const active = tiles.filter(t => !t.removed);
  if (active.length < 2) return tiles;
  const kinds = active.map(t => t.kind);
  for (let attempt = 0; attempt < 250; attempt++) {
    const shuffled = shuffle(kinds, seed + attempt * 1013);
    const candidate = tiles.map(tile => {
      if (tile.removed) return tile;
      const idx = active.findIndex(a => a.id === tile.id);
      return { ...tile, kind: shuffled[idx], suit: KINDS.find(k => k.kind === shuffled[idx])!.suit, label: KINDS.find(k => k.kind === shuffled[idx])!.label };
    });
    if (findAnyMatch(candidate)) return candidate;
  }
  return tiles;
}

export function findAnyMatch(tiles: Tile[]): [string, string] | null {
  const live = tiles.filter(t => !t.removed);
  const free = live.filter(t => isFreeSlot(t, live));
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    if (canMatchKinds(free[i].kind, free[j].kind)) return [free[i].id, free[j].id];
  }
  return null;
}

function slotKey(s: Slot): string { return `${s.x}|${s.y}|${s.layer}`; }
function removeSlot(slots: Slot[], target: Slot): void {
  const i = slots.findIndex(s => slotKey(s) === slotKey(target));
  if (i >= 0) slots.splice(i, 1);
}
function randInt(length: number, seed: number): number {
  const s = Math.abs(Math.floor(seed)) || 1;
  return Math.floor(((s * 1664525 + 1013904223) >>> 0) / 4294967296 * length);
}
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]; let s = Math.abs(Math.floor(seed)) || 1;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
