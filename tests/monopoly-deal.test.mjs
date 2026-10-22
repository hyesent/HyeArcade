import test from 'node:test';
import assert from 'node:assert/strict';
import { monopolyDealSetup, mdCurrent, mdLegalMoves, mdValidate, mdApply, mdBot } from '../src/games/monopoly-deal/logic.ts';

const players = [
  { id: 'deal-a', name: 'A', kind: 'human', seat: 0, connected: true },
  { id: 'deal-b', name: 'B', kind: 'remote', seat: 1, connected: true },
];

test('Monopoly Deal has a distinct draw phase and never offers a second draw after three plays', () => {
  let state = monopolyDealSetup(players);
  const first = mdCurrent(state);
  const draw = mdLegalMoves(state, first).find(move => move.payload.action === 'draw');
  assert.ok(draw && mdValidate(state, draw));
  state = mdApply(state, draw);
  assert.equal(state.hasDrawn, true);
  assert.equal(state.playsLeft, 3);

  const moneyCards = Object.values(state.cards).filter(card => card.kind === 'money').slice(0, 3).map(card => card.id);
  state = { ...state, hands: { ...state.hands, [first]: [...moneyCards, ...state.hands[first].filter(id => !moneyCards.includes(id)).slice(0, 4)] } };
  for (const cardId of moneyCards) {
    const move = { type: 'playMoney', player: first, payload: { action: 'playMoney', cardId }, ts: Date.now() };
    assert.ok(mdValidate(state, move));
    state = mdApply(state, move);
  }
  assert.equal(state.playsLeft, 0);
  const next = mdLegalMoves(state, first);
  assert.ok(next.some(move => move.payload.action === 'endTurn'));
  assert.ok(!next.some(move => move.payload.action === 'draw'), 'a player must not redraw after using all three plays');
});

test('Monopoly Deal exposes a valid discard action when a hand exceeds seven cards', () => {
  let state = monopolyDealSetup(players);
  const player = mdCurrent(state);
  const ids = Object.keys(state.cards).slice(0, 8);
  state = { ...state, hasDrawn: true, playsLeft: 2, hands: { ...state.hands, [player]: ids } };
  const moves = mdLegalMoves(state, player);
  const discard = moves.find(move => move.payload.action === 'discard');
  assert.ok(discard, 'over-limit hands need a discard move');
  assert.equal(discard.payload.cardIds.length, 1);
  assert.ok(mdValidate(state, discard));
  const next = mdApply(state, discard);
  assert.equal(next.hands[player].length, 7);
});

test('Monopoly Deal pending responses route the turn to the player who owes payment', () => {
  const state = monopolyDealSetup(players);
  const pending = { ...state, pending: { type: 'rent', sourcePlayer: players[0].id, targetPlayer: players[1].id, amount: 3, cardId: 'rent-card' } };
  assert.equal(mdCurrent(pending), players[1].id);
  assert.ok(mdLegalMoves(pending, players[1].id).some(move => move.payload.action === 'respond'));
  assert.equal(mdLegalMoves(pending, players[0].id).length, 0);
});


test('Monopoly Deal bot does not try to draw twice in the same turn', () => {
  let state = monopolyDealSetup(players);
  const player = mdCurrent(state);
  state = { ...state, hasDrawn: true, playsLeft: 0 };
  const move = mdBot(state, player);
  assert.notEqual(move.payload.action, 'draw');
  assert.ok(mdValidate(state, move));
});
