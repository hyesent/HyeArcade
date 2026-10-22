import type { VitaTile, TileSuit } from './types';

type Slot = { x: number; y: number; layer: number };

// Canonical Turtle / Vita-style 144-tile footprint:
// 87 + 36 + 16 + 4 + 1 across five layers. The half-grid head, tail,
// and cap positions are important because they create real partial cover.
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
  [3, 3, 6, 2], [3, 4, 6, 2],
];

const TURTLE_EXTRA: Slot[] = [
  { x: 0, y: 3.5, layer: 0 },
  { x: 13, y: 3.5, layer: 0 },
  { x: 14, y: 3.5, layer: 0 },
  { x: 6.5, y: 3.5, layer: 4 },
];

export const SLOTS: Slot[] = [
  ...TURTLE_ROWS.flatMap(([layer, y, start, count]) =>
    Array.from({ length: count }, (_, i) => ({ x: start + i, y, layer }))
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

function matchKey(kind: string): string {
  if (kind.startsWith('flower-')) return 'flower';
  if (kind.startsWith('season-')) return 'season';
  return kind;
}

function canMatchKinds(a: string, b: string): boolean {
  return a !== b ? matchKey(a) === matchKey(b) : false;
}

export function isFreeSlot(tile: Slot, all: Slot[]): boolean {
  if (all.some(t => t.layer === tile.layer + 1 && Math.abs(t.x - tile.x) < 1 && Math.abs(t.y - tile.y) < 1)) return false;
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
    const rngSeed = (seed + attempt * 0x45d9f3b) | 0;
    const active = SLOTS.map(s => ({ ...s }));
    const assigned = new Map<string, string>();
    const pairs = pairPool(rngSeed);
    let ok = true;

    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
      const [aKind, bKind] = pairs[pairIndex];
      const free = active.filter(s => isFreeSlot(s, active));
      if (free.length < 2) { ok = false; break; }
      const aIndex = randInt(free.length, rngSeed + pairIndex * 977);
      const a = free[aIndex];
      const rest = free.filter(s => s !== a);
      const b = rest[randInt(rest.length, rngSeed ^ (aIndex * 2654435761))];
      assigned.set(slotKey(a), aKind);
      assigned.set(slotKey(b), bKind);
      removeSlot(active, a);
      removeSlot(active, b);
    }

    if (!ok || active.length) continue;
    return { slots: SLOTS.map(s => ({ ...s })), kinds: SLOTS.map(s => assigned.get(slotKey(s))!) };
  }
  throw new Error('Vita Mahjong could not generate a solvable Turtle deal');
}

export function buildVitaTiles(seed = Date.now()): VitaTile[] {
  const generated = generateSolvable(seed);
  return generated.slots.map((slot, i) => {
    const kind = generated.kinds[i];
    const meta = KINDS.find(k => k.kind === kind)!;
    return { id: `v-${i}`, ...meta, ...slot, removed: false, inTray: false };
  });
}

export function shuffleVitaTiles(tiles: VitaTile[], seed: number): VitaTile[] {
  const active = tiles.filter(t => !t.removed && !t.inTray);
  if (active.length < 2) return tiles;

  const kindPool = active.map(t => t.kind);
  for (let attempt = 0; attempt < 250; attempt++) {
    const shuffled = shuffle(kindPool, seed + attempt * 1013);
    const candidate = tiles.map((tile) => {
      if (tile.removed || tile.inTray) return tile;
      const kind = shuffled[active.findIndex(a => a.id === tile.id)];
      const meta = KINDS.find(k => k.kind === kind)!;
      return { ...tile, ...meta, removed: false, inTray: false };
    });
    if (findPlayablePairs(candidate).length) return candidate;
  }
  return tiles;
}

export function findPlayablePairs(tiles: VitaTile[]): [string, string][] {
  const free = tiles.filter(t => !t.removed && isFreeSlot(t, tiles));
  const out: [string, string][] = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (canMatchKinds(free[i].kind, free[j].kind)) out.push([free[i].id, free[j].id]);
    }
  }
  return out;
}

function slotKey(s: Slot): string { return `${s.x}|${s.y}|${s.layer}`; }
function removeSlot(slots: Slot[], target: Slot): void {
  const index = slots.findIndex(s => slotKey(s) === slotKey(target));
  if (index >= 0) slots.splice(index, 1);
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
