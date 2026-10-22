import test from 'node:test';
import assert from 'node:assert/strict';
import { expansionGames, dominoes, othello, backgammon, battleship, game2048, minesweeper, sudoku, memoryMatch, hearts, hangman } from '../src/games/expansion/index.ts';

function players(count) {
  return Array.from({ length: count }, (_, seat) => ({ id: `p${seat}`, name: `Player ${seat + 1}`, kind: 'human', seat, connected: true }));
}

test('all ten expansion games are registered with unique ids and can make a legal first move', () => {
  assert.equal(expansionGames.length, 10);
  assert.equal(new Set(expansionGames.map(game => game.id)).size, 10);
  for (const game of expansionGames) {
    const state = game.setup(players(game.minPlayers));
    const actor = game.currentPlayer(state);
    const moves = game.legalMoves(state, actor);
    assert.ok(moves.length > 0, `${game.id} should offer an initial action`);
    const chosen = moves[0];
    assert.equal(game.validate(state, chosen), true, `${game.id} should validate its own legal move`);
    const next = game.apply(state, chosen);
    assert.ok(next, `${game.id} should apply a legal move`);
  }
});

test('Othello starts with four centre discs and produces legal flipping moves', () => {
  const state = othello.setup(players(2));
  assert.equal(state.board.filter(Boolean).length, 4);
  const legal = othello.legalMoves(state, 'p0');
  assert.equal(legal.length, 4);
  const next = othello.apply(state, legal[0]);
  assert.equal(next.board.filter(v => v === 'B').length, 4);
});

test('Backgammon supports a doubling offer, acceptance, and a dropped-cube win', () => {
  let state = backgammon.setup(players(2));
  const offer = backgammon.legalMoves(state, 'p0').find(move => move.type === 'offer-double');
  assert.ok(offer);
  state = backgammon.apply(state, offer);
  assert.equal(backgammon.currentPlayer(state), 'p1');
  const drop = backgammon.legalMoves(state, 'p1').find(move => move.type === 'drop-double');
  assert.ok(drop);
  state = backgammon.apply(state, drop);
  assert.equal(backgammon.isOver(state).winner, 'p0');
  assert.equal(backgammon.isOver(state).pointsEarned.p0, 1);
});

test('2048 merges equal tiles and detects a completely blocked board', () => {
  let state = game2048.setup(players(1));
  state = { ...state, board: [2, 2, 4, 8, 4, 8, 2, 4, 8, 4, 8, 2, 4, 2, 4, 8], score: 0, over: false };
  state = game2048.apply(state, { type: 'slide', player: 'p0', payload: { direction: 'left' }, ts: Date.now() });
  assert.equal(state.board[0], 4);
  assert.ok(state.score >= 4);
  let blocked = { ...state, board: [2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2], over: false };
  blocked = game2048.apply(blocked, { type: 'slide', player: 'p0', payload: { direction: 'left' }, ts: Date.now() });
  assert.equal(blocked.over, true);
});

test('Minesweeper protects the first revealed square and keeps the mine count', () => {
  const state = minesweeper.setup(players(1));
  const next = minesweeper.apply(state, { type: 'reveal', player: 'p0', payload: { index: state.mines[0] }, ts: Date.now() });
  assert.equal(next.mines.includes(state.mines[0]), false);
  assert.equal(next.mines.length, state.mineCount);
  assert.equal(next.revealed.includes(state.mines[0]), true);
});

test('Sudoku generator returns a valid completed solution', () => {
  const state = sudoku.setup(players(1));
  const expected = '123456789';
  const valid = values => [...values].sort((a,b) => a-b).join('') === expected;
  for (let row = 0; row < 9; row++) assert.equal(valid(state.solution.slice(row * 9, row * 9 + 9)), true);
  for (let col = 0; col < 9; col++) assert.equal(valid(Array.from({length:9}, (_, row) => state.solution[row * 9 + col])), true);
  for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
    const box = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box.push(state.solution[(br * 3 + r) * 9 + bc * 3 + c]);
    assert.equal(valid(box), true);
  }
});

test('LAN player projections hide private hands and ship coordinates', () => {
  let domino = dominoes.setup(players(2));
  const dominoView = dominoes.view(domino, 'p0');
  assert.equal(dominoView.hands[0][0][0], domino.hands[0][0][0]);
  assert.equal(dominoView.hands[1].length, domino.hands[1].length);
  assert.ok(dominoView.hands[1].every(tile => tile[0] === 0 && tile[1] === 0));

  let fleet = battleship.setup(players(2));
  fleet.log.push('p1 fired at A1: HIT');
  const fleetView = battleship.view(fleet, 'p0');
  assert.ok(fleetView.ships[1].every(ship => ship.cells.length === 0));
  assert.ok(fleetView.log.includes('p1 fired a shot'));

  let hand = hearts.setup(players(4));
  hand.passSelections[1] = [22, 31, 44];
  const heartView = hearts.view(hand, 'p0');
  assert.equal(heartView.hands[1].every(card => card.s === '?'), true);
  assert.deepEqual(heartView.passSelections[1], []);
});

test('Battleship awards the win to the player who sinks the opposing fleet', () => {
  const state = battleship.setup(players(2));
  const playerZeroCells = state.ships[0].flatMap(ship => ship.cells);
  state.shots[1] = [...playerZeroCells];
  const result = battleship.isOver(state);
  assert.equal(result.winner, 'p1');
});

test('Hearts requires the two of clubs to lead every round when held', () => {
  const state = hearts.setup(players(4));
  state.passRound = 1;
  state.passed = [true, true, true, true];
  const playerIndex = state.hands.findIndex(hand => hand.some(card => card.s === 'C' && card.r === 2));
  state.turn = playerIndex;
  const legal = hearts.legalMoves(state, state.playerIds[playerIndex]);
  assert.equal(legal.length, 1);
  assert.deepEqual(legal[0].payload.card, { s: 'C', r: 2 });
});

test('Hearts passes three cards, then returns to a normal trick-taking phase', () => {
  let state = hearts.setup(players(4));
  for (let i = 0; i < 4; i++) {
    const actor = hearts.currentPlayer(state);
    const legal = hearts.legalMoves(state, actor);
    const chosen = { ...legal[0], payload: { cards: [0, 1, 2] } };
    assert.equal(hearts.validate(state, chosen), true);
    state = hearts.apply(state, chosen);
  }
  assert.equal(state.passRound, 1);
  assert.ok(state.hands.every(hand => hand.length === 13));
  const actor = hearts.currentPlayer(state);
  assert.ok(hearts.legalMoves(state, actor).some(move => move.type === 'play'));
});

test('Memory Match, Dominoes, Backgammon, and Hangman keep turn and state transitions valid', () => {
  for (const game of [memoryMatch, dominoes, backgammon, hangman]) {
    let state = game.setup(players(game.minPlayers));
    for (let i = 0; i < 20 && !game.isOver(state); i++) {
      const actor = game.currentPlayer(state);
      const legal = game.legalMoves(state, actor);
      assert.ok(legal.length, `${game.id} has no legal move at step ${i}`);
      const chosen = legal[Math.floor(Math.random() * legal.length)];
      assert.equal(game.validate(state, chosen), true, `${game.id} rejected its legal move`);
      state = game.apply(state, chosen);
    }
  }
});
