import test from 'node:test';
import assert from 'node:assert/strict';
import { pirateSetup } from '../src/games/pirate-go/logic.ts';
import { RING, YARD, cellToPercent } from '../src/games/ludo/board-map.ts';

const players = [
  { id: 'p1', name: 'Player One', kind: 'human', seat: 0, connected: true },
  { id: 'p2', name: 'Player Two', kind: 'human', seat: 1, connected: true },
];

test('Pirate Go starts in the mode selected in the lobby', () => {
  const classic = pirateSetup(players, 'classic-pirate');
  const traditional = pirateSetup(players, 'traditional-go');
  assert.equal(classic.mode, 'classic');
  assert.equal(traditional.mode, 'go');
});

test('Ludo path and yard positions use the measured non-square image grid', () => {
  const redStart = cellToPercent(RING[0]);
  const redYard = cellToPercent(YARD.R[0]);
  assert.ok(redStart.left > 10 && redStart.left < 11, `red start x=${redStart.left}`);
  assert.ok(redStart.top > 41 && redStart.top < 43, `red start y=${redStart.top}`);
  assert.ok(redYard.left > 14 && redYard.left < 15, `red yard x=${redYard.left}`);
  assert.ok(redYard.top > 13 && redYard.top < 15, `red yard y=${redYard.top}`);
});
