import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACHIEVEMENT_CATALOG,
  GAME_CATALOG,
  TITLE_CATALOG,
  applyFinishedMatch,
  createProfile,
  exportProfileBackup,
  importProfileBackup,
  getActiveProfile,
  recordFinishedMatch,
  GAME_METRICS,
  type FinishedMatchInput,
} from '../src/profile/profileStore.ts';

function matchInput(profileId: string, patch: Partial<FinishedMatchInput> = {}): FinishedMatchInput {
  return {
    sessionId: 'session-001',
    gameId: 'tic-tac-toe',
    gameName: 'Tic-Tac-Toe',
    players: [
      { id: 'p1', profileId, name: 'Tester', kind: 'human', seat: 0 },
      { id: 'p2', name: 'Bot', kind: 'bot', seat: 1 },
    ],
    playerId: 'p1',
    winnerId: 'p1',
    reason: 'Three in a row',
    scores: { p1: 1, p2: 0 },
    state: {},
    moves: [
      { player: 'p1', type: 'place', ts: 100 },
      { player: 'p2', type: 'place', ts: 200 },
      { player: 'p1', type: 'place', ts: 300 },
      { player: 'p2', type: 'place', ts: 400 },
      { player: 'p1', type: 'place', ts: 500 },
    ],
    startedAt: 100,
    endedAt: 1100,
    ...patch,
  };
}

test('Layer 1 inventory exactly matches the registered games and has unique achievement/title IDs', () => {
  const registry = readFileSync(new URL('../src/games/registry.ts', import.meta.url), 'utf8');
  const importPaths = new Map([...registry.matchAll(/import \{ (\w+) \} from '\.\/([^']+)';/g)].map((match) => [match[1], match[2]]));
  const expansionSource = readFileSync(new URL('../src/games/expansion/index.ts', import.meta.url), 'utf8');
  const expansionIds = [...expansionSource.matchAll(/const\s+\w+:GameDefinition<[^>]+>=\{id:'([^']+)'/g)].map((match) => match[1]);
  const gameList = registry.match(/export const GAMES:[\s\S]*?= \[([\s\S]*?)\] as unknown/);
  assert.ok(gameList, 'The game registry must expose its GAMES array.');
  const registeredIds = gameList[1].split('\n').map((line) => line.trim().replace(/,$/, '')).filter((line) => /^[A-Za-z][A-Za-z0-9]*$/.test(line))
    .map((name) => importPaths.get(name) === 'advanced' ? 'monopoly' : importPaths.get(name)).filter((id): id is string => !!id).concat(expansionIds).sort();
  assert.equal(GAME_CATALOG.length, 32);
  assert.deepEqual(GAME_CATALOG.map((game) => game.id).sort(), registeredIds);
  assert.equal(new Set(GAME_CATALOG.map((game) => game.id)).size, GAME_CATALOG.length);
  assert.equal(ACHIEVEMENT_CATALOG.length, new Set(ACHIEVEMENT_CATALOG.map((item) => item.id)).size);
  assert.equal(TITLE_CATALOG.length, new Set(TITLE_CATALOG.map((item) => item.id)).size);
  assert.ok(GAME_CATALOG.some((game) => game.id === 'ayo' && game.name === 'Ayo Ọlọ́pọ́n'));
  assert.ok(GAME_CATALOG.some((game) => game.id === 'vita-mahjong'));
  assert.equal(Object.keys(GAME_METRICS).length, GAME_CATALOG.length);
  assert.ok(GAME_CATALOG.every((game) => GAME_METRICS[game.id]?.length));
});

test('new profile has a default title and clean, bounded display name', () => {
  const profile = createProfile('  Test\n Player with a very very long name  ', 1234);
  assert.equal(profile.name, 'Test Player with a very ');
  assert.equal(profile.createdAt, 1234);
  assert.equal(profile.activeTitleId, 'arcade-newcomer');
  assert.deepEqual(profile.unlockedTitleIds, ['arcade-newcomer']);
  assert.equal(profile.matchesPlayed, 0);
  assert.equal(profile.totalXp, 0);
});

test('a completed win updates match and game stats, awards XP, and unlocks the right milestones', () => {
  const base = createProfile('Tester', 100);
  const result = applyFinishedMatch(base, matchInput(base.id));
  assert.ok(result.award);
  assert.equal(result.profile.matchesPlayed, 1);
  assert.equal(result.profile.wins, 1);
  assert.equal(result.profile.losses, 0);
  assert.equal(result.profile.currentWinStreak, 1);
  assert.equal(result.profile.gameStats['tic-tac-toe'].matchesPlayed, 1);
  assert.equal(result.profile.gameStats['tic-tac-toe'].wins, 1);
  assert.equal(result.profile.matchHistory[0].outcome, 'win');
  assert.ok(result.profile.totalXp >= 35);
  assert.ok(result.profile.unlockedAchievements.some((item) => item.id === 'first-match'));
  assert.ok(result.profile.unlockedAchievements.some((item) => item.id === 'first-win'));
  assert.ok(result.profile.unlockedAchievements.some((item) => item.id === 'played-tic-tac-toe'));
  assert.ok(result.profile.unlockedAchievements.some((item) => item.id === 'won-tic-tac-toe'));
  assert.equal(result.award.record.id, 'session-001');
  assert.ok(result.award.record.xpEarned > 0);
});

test('session IDs make result recording idempotent', () => {
  const base = createProfile('Tester', 100);
  const first = applyFinishedMatch(base, matchInput(base.id));
  assert.ok(first.award);
  const second = applyFinishedMatch(first.profile, matchInput(first.profile.id));
  assert.equal(second.award, null);
  assert.equal(second.profile.matchesPlayed, 1);
  assert.equal(second.profile.matchHistory.length, 1);
});

test('draws, losses and solo outcomes are classified distinctly', () => {
  const base = createProfile('Tester', 100);
  const draw = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'draw-1', winnerId: null, reason: 'Draw',
  }));
  assert.equal(draw.profile.draws, 1);
  assert.equal(draw.profile.matchHistory[0].outcome, 'draw');
  assert.equal(draw.profile.currentWinStreak, 0);

  const loss = applyFinishedMatch(draw.profile, matchInput(draw.profile.id, {
    sessionId: 'loss-1', winnerId: 'p2', reason: 'Opponent won',
  }));
  assert.equal(loss.profile.losses, 1);
  assert.equal(loss.profile.currentLossStreak, 1);
  assert.equal(loss.profile.matchHistory[0].outcome, 'loss');

  const soloProfile = createProfile('Solo', 100);
  const soloBase = matchInput(soloProfile.id, {
    sessionId: 'solo-1', gameId: 'solitaire', gameName: 'Solitaire',
    players: [{ id: 'p1', profileId: soloProfile.id, name: 'Solo', kind: 'human', seat: 0 }],
    winnerId: 'p1', reason: 'All foundations complete', moves: Array.from({ length: 20 }, (_, i) => ({ player: 'p1', type: 'play', ts: i })),
  });
  const soloWin = applyFinishedMatch(soloProfile, soloBase);
  assert.equal(soloWin.profile.matchHistory[0].outcome, 'solo-success');
  assert.equal(soloWin.profile.soloSuccesses, 1);

  const soloFail = applyFinishedMatch(soloWin.profile, { ...soloBase, sessionId: 'solo-2', winnerId: null, reason: 'No moves remain' });
  assert.equal(soloFail.profile.matchHistory[0].outcome, 'solo-failure');
  assert.equal(soloFail.profile.soloFailures, 1);
});

test('game-specific performance feats unlock only when their qualifying data exists', () => {
  const base = createProfile('Tester', 100);
  const scrabble = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'scrabble-100', gameId: 'scrabble', gameName: 'Scrabble',
    scores: { p1: 120, p2: 45 }, reason: 'Bag empty', state: { scores: { p1: 120, p2: 45 } },
  }));
  assert.ok(scrabble.profile.unlockedAchievements.some((item) => item.id === 'scrabble-100'));

  const vita = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'vita-combo', gameId: 'vita-mahjong', gameName: 'Vita Mahjong',
    state: { bestCombo: 5, score: 800 }, reason: 'Board cleared',
    players: [{ id: 'p1', profileId: base.id, name: 'Tester', kind: 'human', seat: 0 }],
    winnerId: 'p1',
  }));
  assert.ok(vita.profile.unlockedAchievements.some((item) => item.id === 'vita-combo-5'));

  const notYet = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'scrabble-under', gameId: 'scrabble', gameName: 'Scrabble', scores: { p1: 99, p2: 10 },
  }));
  assert.ok(!notYet.profile.unlockedAchievements.some((item) => item.id === 'scrabble-100'));
});

test('full-cabinet achievement and completionist title unlock after all registered games are completed', () => {
  let profile = createProfile('Explorer', 100);
  GAME_CATALOG.forEach((game, index) => {
    const result = applyFinishedMatch(profile, matchInput(profile.id, {
      sessionId: `cabinet-${index}`,
      gameId: game.id,
      gameName: game.name,
      players: [{ id: 'p1', profileId: profile.id, name: profile.name, kind: 'human', seat: 0 }, { id: 'p2', name: 'Bot', kind: 'bot', seat: 1 }],
      playerId: 'p1', winnerId: 'p1', reason: 'Match complete',
    }));
    profile = result.profile;
  });
  assert.equal(profile.matchesPlayed, GAME_CATALOG.length);
  assert.equal(Object.values(profile.gameStats).filter((game) => game.matchesPlayed > 0).length, GAME_CATALOG.length);
  assert.ok(profile.unlockedAchievements.some((item) => item.id === 'games-all'));
  assert.ok(profile.unlockedTitleIds.includes('arcade-completionist'));
});

test('backup export/import preserves identity, unlocks and match history; rejects invalid files', () => {
  const base = createProfile('Backup Tester', 100);
  const complete = applyFinishedMatch(base, matchInput(base.id)).profile;
  const raw = exportProfileBackup(complete);
  const fresh = importProfileBackup(raw);
  const restored = fresh.profiles.find((profile) => profile.id === complete.id);
  assert.ok(restored);
  assert.equal(restored.name, 'Backup Tester');
  assert.equal(restored.matchesPlayed, 1);
  assert.ok(restored.unlockedAchievements.some((item) => item.id === 'first-win'));
  assert.throws(() => importProfileBackup('{ broken'), /valid JSON/i);
  assert.throws(() => importProfileBackup(JSON.stringify({ product: 'Not Hye Arcade', schemaVersion: 1 })), /supported Hye Arcade/i);
});


test('game-specific metrics use actual terminal-state fields for Monopoly, Ludo, Scramble and Ayo', () => {
  const base = createProfile('Metrics Tester', 100);
  const monopoly = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'metrics-monopoly', gameId: 'monopoly', gameName: 'Monopoly',
    state: {
      owned: { a1: 'p1', a2: 'p2', b1: 'p1', r1: null },
      money: { p1: 850, p2: 1200 },
    },
    moves: [
      { player: 'p1', type: 'buy', payload: { propertyId: 'a1' }, ts: 100 },
      { player: 'p2', type: 'buy', payload: { propertyId: 'a2' }, ts: 200 },
      { player: 'p1', type: 'buy', payload: { propertyId: 'b1' }, ts: 300 },
    ],
  }));
  assert.equal(monopoly.profile.gameStats.monopoly.metrics.propertiesOwned, 2);
  assert.equal(monopoly.profile.gameStats.monopoly.metrics.cashAtFinish, 850);

  const ludo = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'metrics-ludo', gameId: 'ludo', gameName: 'Ludo',
    state: {
      playerIds: { R: 'p1', G: 'p2' },
      pawns: [
        { color: 'R', state: 'finished', step: 57 },
        { color: 'R', state: 'ring', step: 40 },
        { color: 'G', state: 'finished', step: 57 },
      ],
    },
    moves: [
      { player: 'p1', type: 'roll', payload: { value: 6 }, ts: 100 },
      { player: 'p2', type: 'roll', payload: { value: 4 }, ts: 200 },
      { player: 'p1', type: 'roll', payload: { value: 3 }, ts: 300 },
    ],
  }));
  assert.equal(ludo.profile.gameStats.ludo.metrics.pawnsFinished, 1);
  assert.equal(ludo.profile.gameStats.ludo.metrics.diceRolls, 2);

  const scramble = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'metrics-scramble', gameId: 'scramble', gameName: 'Scramble',
    state: { solved: { p1: 4, p2: 2 }, scores: { p1: 420, p2: 210 } },
    scores: { p1: 420, p2: 210 },
  }));
  assert.equal(scramble.profile.gameStats.scramble.metrics.correctAnswers, 4);

  const ayo = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'metrics-ayo', gameId: 'ayo', gameName: 'Ayo Ọlọ́pọ́n',
    state: { playerIds: ['p1', 'p2'], captured: [51, 49], moves: 100 },
    moves: [
      { player: 'p1', type: 'sow', payload: { pit: 0 }, ts: 100 },
      { player: 'p2', type: 'sow', payload: { pit: 6 }, ts: 200 },
      { player: 'p1', type: 'sow', payload: { pit: 1 }, ts: 300 },
      { player: 'p2', type: 'sow', payload: { pit: 7 }, ts: 400 },
      { player: 'p1', type: 'sow', payload: { pit: 2 }, ts: 500 },
    ],
    scores: { p1: 51, p2: 49 },
  }));
  assert.equal(ayo.profile.gameStats.ayo.metrics.seedsCaptured, 51);
  assert.equal(ayo.profile.gameStats.ayo.metrics.movesPlayed, 3); // Count this player's moves, not the match-wide state.moves counter.
  assert.ok(ayo.profile.unlockedAchievements.some((item) => item.id === 'ayo-50-seeds'));
  assert.equal(Object.keys(GAME_METRICS).length, GAME_CATALOG.length);
});

test('five game wins unlock a game title, and ten unlock the mastery achievement', () => {
  let profile = createProfile('Specialist', 100);
  for (let i = 0; i < 10; i += 1) {
    profile = applyFinishedMatch(profile, matchInput(profile.id, { sessionId: `ttt-win-${i}` })).profile;
  }
  assert.ok(profile.unlockedTitleIds.includes('title-tic-tac-toe'));
  assert.ok(profile.unlockedAchievements.some((item) => item.id === 'mastered-tic-tac-toe'));
  assert.equal(profile.gameStats['tic-tac-toe'].wins, 10);
});

test('profile persistence records a finished result only once for the matched local profile', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
      clear: () => data.clear(),
      key: (index: number) => [...data.keys()][index] ?? null,
      get length() { return data.size; },
    },
  });
  try {
    const profile = getActiveProfile();
    const input = matchInput(profile.id, { sessionId: 'persisted-once' });
    const first = recordFinishedMatch(input);
    const second = recordFinishedMatch(input);
    assert.ok(first);
    assert.equal(second, null);
    assert.equal(getActiveProfile().matchesPlayed, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test('backup import safely normalizes older match records without a metrics field', () => {
  const base = createProfile('Old Backup', 100);
  const completed = applyFinishedMatch(base, matchInput(base.id)).profile;
  const backup = JSON.parse(exportProfileBackup(completed)) as { profile: { matchHistory: Array<Record<string, unknown>> } };
  delete backup.profile.matchHistory[0].metrics;
  const restored = importProfileBackup(JSON.stringify({ product: 'Hye Arcade', schemaVersion: 1, profile: backup.profile }));
  const profile = restored.profiles.find((candidate) => candidate.id === completed.id);
  assert.ok(profile);
  assert.deepEqual(profile.matchHistory[0].metrics, {});
});


test('UNO draw actions are not miscounted as cards played', () => {
  const base = createProfile('Card Counter', 100);
  const result = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'uno-card-metrics', gameId: 'uno', gameName: 'UNO',
    moves: [
      { player: 'p1', type: 'play', payload: { cardId: 'u-1' }, ts: 100 },
      { player: 'p1', type: 'play', payload: { type: 'draw' }, ts: 200 },
      { player: 'p2', type: 'play', payload: { cardId: 'u-2' }, ts: 300 },
    ],
  }));
  assert.equal(result.profile.gameStats.uno.metrics.cardsPlayed, 1);
  assert.equal(result.profile.gameStats.uno.metrics.cardsDrawn, 1);
});

test('Drafts and Checkers preserve crown events in recorded move payloads', () => {
  const base = createProfile('Draughts Tester', 100);
  const result = applyFinishedMatch(base, matchInput(base.id, {
    sessionId: 'checkers-promotion-metric', gameId: 'checkers', gameName: 'Checkers',
    moves: [
      { player: 'p1', type: 'move', payload: { from: 10, to: 1, captured: 5, promoted: true }, ts: 100 },
      { player: 'p2', type: 'move', payload: { from: 15, to: 24, captured: null }, ts: 200 },
    ],
  }));
  assert.equal(result.profile.gameStats.checkers.metrics.captures, 1);
  assert.equal(result.profile.gameStats.checkers.metrics.promotions, 1);
});

test('finished match records retain the original setup and ordered event payloads', () => {
  const profile = createProfile('History Tester', 10);
  const initialState = { board: [0, 0, 0], seed: 42 };
  const input = matchInput(profile.id, { initialState, moves: [
    { player: 'p1', type: 'place', payload: { cell: 0 }, ts: 100 },
    { player: 'p2', type: 'place', payload: { cell: 4 }, ts: 200 },
  ] });
  const result = applyFinishedMatch(profile, input);
  assert.ok(result.award);
  assert.deepEqual(result.award.record.initialState, initialState);
  assert.deepEqual(result.award.record.moveHistory?.map(move => move.payload), [{ cell: 0 }, { cell: 4 }]);
});

test('Monopoly supports up to five purchase offers when landing on another player property', async () => {
  const { monopoly } = await import('../src/games/advanced.ts');
  const { dispatch } = await import('../src/core/engine.ts');
  const players = [
    { id: 'p1', name: 'Buyer', kind: 'human' as const, seat: 0, connected: true },
    { id: 'p2', name: 'Owner', kind: 'human' as const, seat: 1, connected: true },
  ];
  const state = monopoly.setup(players, 'hye-city');
  const property = state.properties[1];
  state.owned[property.id] = 'p2';
  state.phase = 'offer';
  state.turn = 0;
  state.offerPropertyId = property.id;
  const session = {
    id: 'monopoly-offer-test', gameId: 'monopoly', players, state,
    initialState: structuredClone(state), history: [], status: 'playing' as const,
    result: null, createdAt: 1, updatedAt: 1,
  };
  let current = session;
  for (let attempt = 1; attempt <= 5; attempt++) {
    current = dispatch(monopoly, current, { type: 'trade', player: 'p1', payload: { action: 'offer_purchase', amount: 100 + attempt * 10 }, ts: attempt });
    assert.equal(current.state.pendingPurchaseOffer?.attempt, attempt);
    current = dispatch(monopoly, current, { type: 'trade', player: 'p2', payload: { action: 'reject_purchase' }, ts: attempt + 10 });
    assert.equal(current.state.phase, 'offer');
  }
  assert.throws(() => dispatch(monopoly, current, { type: 'trade', player: 'p1', payload: { action: 'offer_purchase', amount: 200 }, ts: 99 }), /Illegal move/);
  current = dispatch(monopoly, current, { type: 'trade', player: 'p1', payload: { action: 'end_offer' }, ts: 100 });
  assert.equal(current.state.phase, 'roll');
});

test('Monopoly accepted purchase offer transfers cash and ownership, including off-turn response', async () => {
  const { monopoly } = await import('../src/games/advanced.ts');
  const { dispatch } = await import('../src/core/engine.ts');
  const players = [
    { id: 'p1', name: 'Buyer', kind: 'human' as const, seat: 0, connected: true },
    { id: 'p2', name: 'Owner', kind: 'human' as const, seat: 1, connected: true },
  ];
  const state = monopoly.setup(players, 'hye-city');
  const property = state.properties[1];
  state.owned[property.id] = 'p2';
  state.phase = 'offer'; state.turn = 0; state.offerPropertyId = property.id;
  const session = { id:'monopoly-accept-test', gameId:'monopoly', players, state, initialState:structuredClone(state), history:[], status:'playing' as const, result:null, createdAt:1, updatedAt:1 };
  let current = dispatch(monopoly, session, { type:'trade', player:'p1', payload:{action:'offer_purchase', amount:500}, ts:2 });
  current = dispatch(monopoly, current, { type:'trade', player:'p2', payload:{action:'accept_purchase'}, ts:3 });
  assert.equal(current.state.owned[property.id], 'p1');
  assert.equal(current.state.money.p1, 1000);
  assert.equal(current.state.money.p2, 2000);
  assert.equal(current.state.pendingPurchaseOffer, null);
  assert.equal(current.state.phase, 'roll');
});

test('saved match event history survives profile backup export and import', () => {
  const profile = createProfile('Replay Data Tester', 50);
  const result = applyFinishedMatch(profile, matchInput(profile.id, {
    initialState: { setup: 'original' },
    moves: [{ player: 'p1', type: 'move', payload: { from: 2, to: 5 }, ts: 101 }],
  }));
  assert.ok(result.award);
  const library = importProfileBackup(exportProfileBackup(result.profile));
  const saved = library.profiles.find(profile => profile.id === result.profile.id)?.matchHistory.find(match => match.id === 'session-001');
  assert.deepEqual(saved?.initialState, { setup: 'original' });
  assert.deepEqual(saved?.moveHistory?.[0]?.payload, { from: 2, to: 5 });
  assert.equal(saved?.playerRoster?.find(player => player.id === 'p2')?.name, 'Bot');
});

test('every registered game has a short card description and a fuller game guide summary', async () => {
  const { GAME_DESCRIPTIONS } = await import('../src/games/descriptions.ts');
  assert.equal(GAME_CATALOG.length, 32);
  assert.ok(GAME_CATALOG.every(game => GAME_DESCRIPTIONS[game.id]?.short && GAME_DESCRIPTIONS[game.id]?.about));
});
