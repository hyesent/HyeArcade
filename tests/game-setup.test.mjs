import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTiles, SLOTS, findAnyMatch } from '../src/games/mahjong-solitaire/layout.ts';

test('Mahjong Solitaire generates the canonical 144-tile Turtle layout', () => {
  assert.equal(SLOTS.length, 144, 'Turtle layout must contain 144 positions, without duplicate cap tiles');
  for (let seed = 1; seed <= 30; seed += 1) {
    const tiles = buildTiles(seed * 7919);
    assert.equal(tiles.length, 144, `seed ${seed} should create all 144 tiles`);
    assert.equal(new Set(tiles.map(tile => tile.id)).size, 144, 'tile IDs must be unique');
    assert.ok(tiles.every(tile => tile.kind && tile.suit), 'every tile must have a kind and suit');
    assert.ok(findAnyMatch(tiles), `seed ${seed} should begin with at least one available pair`);
  }
});
