import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 18000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
let child;

async function waitForServer() {
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    try {
      const response = await fetch(base);
      if (response.status === 404) return;
    } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error('LAN server did not start in time');
}

async function post(path, body) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('LAN relay validates sender identity, sequences events, and limits chat payloads', async t => {
  child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(port), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  await waitForServer();

  const create = await post('/api/rooms', { gameId: 'chess', player: { name: 'Host' } });
  assert.equal(create.status, 200);
  const host = await create.json();
  const join = await post(`/api/rooms/${host.code}/join`, { gameId: 'chess', player: { name: 'Guest' } });
  assert.equal(join.status, 200);
  const guest = await join.json();
  const discover = await fetch(`${base}/api/rooms/${host.code}`);
  const discoverInfo = await discover.json();
  assert.equal(discoverInfo.code, host.code);
  assert.equal('session' in discoverInfo, false, 'room discovery should not expose a full game session');
  await post(`/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  const start = await post(`/api/rooms/${host.code}/start`, { clientId: host.clientId });
  assert.equal(start.status, 200);

  const acceptedByGuest = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'move.accepted', move: { player: guest.clientId, type: 'move', payload: {}, ts: Date.now() } } });
  assert.equal(acceptedByGuest.status, 403, 'only the coordinator may publish accepted moves');

  const spoof = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'move', move: { player: host.clientId, type: 'move', payload: {}, ts: Date.now() } } });
  assert.equal(spoof.status, 403, 'a guest must not submit a move under the host identity');

  const request = { type: 'chat', player: guest.clientId, text: 'Hello', ts: Date.now(), requestId: 'guest-chat-1' };
  const chat = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: request });
  assert.equal(chat.status, 200);
  const ack = await chat.json();
  assert.ok(Number.isInteger(ack.sequence) && ack.sequence > 0);
  const retry = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: request });
  const retryAck = await retry.json();
  assert.equal(retryAck.sequence, ack.sequence, 'retry must not create a duplicate chat event');
  assert.equal(retryAck.deduplicated, true);

  const spoofChat = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'chat', player: host.clientId, text: 'Impersonation', ts: Date.now() } });
  assert.equal(spoofChat.status, 403, 'a guest must not speak as another player');

  const tooLong = await post(`/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'chat', text: 'x'.repeat(5000), ts: Date.now() } });
  assert.equal(tooLong.status, 200, 'server safely truncates overlong chat to the protocol limit');
});


test('Whot LAN rooms support the game engine maximum of six players', async t => {
  const whotPort = 18000 + Math.floor(Math.random() * 20000);
  const whotBase = `http://127.0.0.1:${whotPort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(whotPort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    try { const response = await fetch(whotBase); if (response.status === 404) break; }
    catch { /* server starting */ }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  const created = await postAt(whotBase, '/api/rooms', { gameId: 'whot', player: { name: 'Host' } });
  assert.equal(created.status, 200);
  const room = await created.json();
  for (let i = 2; i <= 6; i += 1) {
    const joined = await postAt(whotBase, `/api/rooms/${room.code}/join`, { gameId: 'whot', player: { name: `Player ${i}` } });
    assert.equal(joined.status, 200, `player ${i} should be admitted`);
  }
  const overflow = await postAt(whotBase, `/api/rooms/${room.code}/join`, { gameId: 'whot', player: { name: 'Player 7' } });
  assert.equal(overflow.status, 409, 'seventh player must be rejected');
});

async function postAt(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('LAN relay survives concurrent chat bursts and rejects forged session membership', async t => {
  const stressPort = 22000 + Math.floor(Math.random() * 12000);
  const stressBase = `http://127.0.0.1:${stressPort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(stressPort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    try { const response = await fetch(stressBase); if (response.status === 404) break; }
    catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  const created = await postAt(stressBase, '/api/rooms', { gameId: 'connect-four', player: { name: 'Host', profileId: 'profile-host' } });
  assert.equal(created.status, 200);
  const room = await created.json();
  const joined = await postAt(stressBase, `/api/rooms/${room.code}/join`, { gameId: 'connect-four', player: { name: 'Guest', profileId: 'profile-guest' } });
  assert.equal(joined.status, 200);
  const guest = await joined.json();
  assert.equal(guest.session.players[0].profileId, 'profile-host', 'profile identity should survive room membership');
  assert.equal(guest.session.players[1].profileId, 'profile-guest');

  const badSession = { id: 'session', gameId: 'connect-four', players: [{ id: room.clientId, name: 'Host' }, { id: 'forged-player', name: 'Imposter' }], state: {}, history: [], status: 'playing', result: null, createdAt: Date.now(), updatedAt: Date.now() };
  const rejected = await postAt(stressBase, `/api/rooms/${room.code}/session`, { clientId: room.clientId, session: badSession });
  assert.equal(rejected.status, 409, 'host snapshots must not add or replace room members');

  const sends = Array.from({ length: 10 }, (_, i) => postAt(stressBase, `/api/rooms/${room.code}/message`, {
    clientId: guest.clientId,
    message: { type: 'chat', player: guest.clientId, text: `stress-${i}`, ts: Date.now(), requestId: `stress-${i}` },
  }));
  const responses = await Promise.all(sends);
  assert.ok(responses.every(response => response.status === 200), 'ten concurrent messages should fit below the rate limit');
  const acknowledgements = await Promise.all(responses.map(response => response.json()));
  const sequences = acknowledgements.map(item => item.sequence);
  assert.equal(new Set(sequences).size, 10, 'every accepted message must have a unique event sequence');
  const ordered = [...sequences].sort((a, b) => a - b);
  assert.ok(ordered.every((value, index) => index === 0 || value === ordered[index - 1] + 1), 'concurrent events should receive contiguous sequence numbers');
});

test('private-information games require a view for every player and deliver only that player view', async t => {
  const privatePort = 24000 + Math.floor(Math.random() * 10000);
  const privateBase = `http://127.0.0.1:${privatePort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(privatePort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    try { const response = await fetch(privateBase); if (response.status === 404) break; }
    catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  const created = await postAt(privateBase, '/api/rooms', { gameId: 'uno', player: { name: 'Host' } });
  assert.equal(created.status, 200);
  const host = await created.json();
  const joined = await postAt(privateBase, `/api/rooms/${host.code}/join`, { gameId: 'uno', player: { name: 'Guest' } });
  assert.equal(joined.status, 200);
  const guest = await joined.json();
  await postAt(privateBase, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  await postAt(privateBase, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  await postAt(privateBase, `/api/rooms/${host.code}/start`, { clientId: host.clientId });

  const state = { hands: [{ playerId: host.clientId, cards: ['secret-host-card'] }, { playerId: guest.clientId, cards: ['secret-guest-card'] }], deck: ['secret-deck-card'] };
  const session = { id: 'match', gameId: 'uno', players: host.session.players.length ? guest.session.players : [], state, initialState: state, history: [{ player: host.clientId, payload: { cardId: 'secret-history-card' } }], status: 'playing', result: null, createdAt: Date.now(), updatedAt: Date.now() };
  const noViews = await postAt(privateBase, `/api/rooms/${host.code}/session`, { clientId: host.clientId, session });
  assert.equal(noViews.status, 409, 'private-state snapshots without player projections must be rejected');

  const hostView = { ...session, history: session.history }; 
  const guestView = { ...session, state: { hands: [{ playerId: host.clientId, cards: ['__hidden__'] }, { playerId: guest.clientId, cards: ['secret-guest-card'] }], deck: ['__hidden__'] }, initialState: null, history: [{ type: 'play', player: host.clientId, ts: Date.now(), payload: {}, summary: 'Played a card' }] };
  const posted = await postAt(privateBase, `/api/rooms/${host.code}/session`, { clientId: host.clientId, session, views: { [host.clientId]: hostView, [guest.clientId]: guestView } });
  assert.equal(posted.status, 200);
  const stream = await fetch(`${privateBase}/api/rooms/${host.code}/events?clientId=${encodeURIComponent(guest.clientId)}`);
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let firstChunk = '';
  while (!firstChunk.includes('data: ')) {
    const { value, done } = await reader.read();
    if (done) break;
    firstChunk += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  const dataLine = firstChunk.split('\n').find(line => line.startsWith('data: '));
  assert.ok(dataLine, 'SSE should immediately send the current session');
  const delivered = JSON.parse(dataLine.slice(6));
  assert.equal(delivered.session.state.hands[0].cards[0], '__hidden__');
  assert.equal(delivered.session.state.hands[1].cards[0], 'secret-guest-card');
  assert.equal(delivered.session.history.length, 1, 'safe history summaries are available to guests');
  assert.equal(delivered.session.history[0].summary, 'Played a card');
  assert.deepEqual(delivered.session.history[0].payload, {}, 'private card IDs and raw payloads are stripped from guest history');
  const hostStream = await fetch(`${privateBase}/api/rooms/${host.code}/events?clientId=${encodeURIComponent(host.clientId)}`);
  const hostReader = hostStream.body.getReader();
  let hostChunk = '';
  while (!hostChunk.includes('data: ')) { const { value, done } = await hostReader.read(); if (done) break; hostChunk += decoder.decode(value, { stream: true }); }
  await hostReader.cancel();
  const hostLine = hostChunk.split('\n').find(line => line.startsWith('data: '));
  assert.ok(hostLine);
  const hostDelivered = JSON.parse(hostLine.slice(6));
  assert.equal(hostDelivered.session.history.length, 1, 'the host must retain authoritative history for match history/replay');
});

test('guest move requests are private to the host and do not create sequence gaps for other guests', async t => {
  const relayPort = 19000 + Math.floor(Math.random() * 15000);
  const relayBase = `http://127.0.0.1:${relayPort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(relayPort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) { try { const r = await fetch(relayBase); if (r.status === 404) break; } catch {} await new Promise(resolve => setTimeout(resolve, 60)); }
  const created = await postAt(relayBase, '/api/rooms', { gameId: 'connect-four', player: { name: 'Host' } });
  const host = await created.json();
  const joined = await postAt(relayBase, `/api/rooms/${host.code}/join`, { gameId: 'connect-four', player: { name: 'Guest' } });
  const guest = await joined.json();
  await postAt(relayBase, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  await postAt(relayBase, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  await postAt(relayBase, `/api/rooms/${host.code}/start`, { clientId: host.clientId });

  async function openStream(clientId) {
    const response = await fetch(`${relayBase}/api/rooms/${host.code}/events?clientId=${encodeURIComponent(clientId)}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); let buffer = '';
    async function next(timeout = 1800) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const split = buffer.indexOf('\n\n');
        if (split >= 0) {
          const frame = buffer.slice(0, split); buffer = buffer.slice(split + 2);
          const data = frame.split('\n').find(line => line.startsWith('data: '));
          if (data) return JSON.parse(data.slice(6));
          continue;
        }
        const remaining = deadline - Date.now();
        const read = reader.read();
        const result = await Promise.race([read, new Promise(resolve => setTimeout(() => resolve({ timeout: true }), remaining))]);
        if (result.timeout) return null;
        if (result.done) return null;
        buffer += decoder.decode(result.value, { stream: true });
      }
      return null;
    }
    return { next, close: () => reader.cancel() };
  }
  const hostStream = await openStream(host.clientId);
  const guestStream = await openStream(guest.clientId);
  await hostStream.next(); await guestStream.next();
  const posted = await postAt(relayBase, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'move', move: { player: guest.clientId, type: 'drop', payload: { column: 2 }, ts: Date.now() }, requestId: 'private-move-1' } });
  assert.equal(posted.status, 200);
  const hostMove = await hostStream.next();
  assert.equal(hostMove?.type, 'move', 'the coordinator receives the pending move');
  assert.equal(hostMove?.sequence, 0, 'pending requests are not part of the shared event sequence');
  const accepted = await postAt(relayBase, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'move.accepted', move: { player: guest.clientId, type: 'drop', payload: { column: 2 }, ts: Date.now() }, requestId: 'accepted-move-1' } });
  assert.equal(accepted.status, 200);
  const [hostAccepted, guestAccepted] = await Promise.all([hostStream.next(), guestStream.next()]);
  assert.equal(hostAccepted?.type, 'move.accepted');
  assert.equal(guestAccepted?.type, 'move.accepted');
  assert.ok(guestAccepted.sequence > 0, 'the next public event retains a valid shared sequence');
  await hostStream.close(); await guestStream.close();
});

test('LAN room start preserves the host-selected board or game mode', async t => {
  const modePort = 21000 + Math.floor(Math.random() * 10000);
  const modeBase = `http://127.0.0.1:${modePort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(modePort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) { try { const r = await fetch(modeBase); if (r.status === 404) break; } catch {} await new Promise(resolve => setTimeout(resolve, 60)); }
  const created = await postAt(modeBase, '/api/rooms', { gameId: 'pirate-go', player: { name: 'Host' } });
  const host = await created.json();
  const guestResponse = await postAt(modeBase, `/api/rooms/${host.code}/join`, { gameId: 'pirate-go', player: { name: 'Guest' } });
  const guest = await guestResponse.json();
  await postAt(modeBase, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  await postAt(modeBase, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  const started = await postAt(modeBase, `/api/rooms/${host.code}/start`, { clientId: host.clientId, boardId: 'traditional-go' });
  assert.equal(started.status, 200);
  const stream = await fetch(`${modeBase}/api/rooms/${host.code}/events?clientId=${encodeURIComponent(host.clientId)}`);
  const reader = stream.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  try {
    const deadline = Date.now() + 2000;
    while (!buffer.includes('data: ') && Date.now() < deadline) { const {value,done}=await reader.read(); if(done) break; buffer += decoder.decode(value,{stream:true}); }
    const data = buffer.split('\n').find(line=>line.startsWith('data: '));
    assert.ok(data);
    const event = JSON.parse(data.slice(6));
    assert.equal(event.session.boardId, 'traditional-go');
  } finally { await reader.cancel(); }
});


test('LAN host can register configured bots when starting a room', async t => {
  const botPort = 22000 + Math.floor(Math.random() * 9000);
  const botBase = `http://127.0.0.1:${botPort}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(botPort), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) { try { const r = await fetch(botBase); if (r.status === 404) break; } catch {} await new Promise(resolve => setTimeout(resolve, 60)); }
  const created = await postAt(botBase, '/api/rooms', { gameId: 'ludo', player: { name: 'Host' } });
  const host = await created.json();
  const guestResponse = await postAt(botBase, `/api/rooms/${host.code}/join`, { gameId: 'ludo', player: { name: 'Guest' } });
  const guest = await guestResponse.json();
  await postAt(botBase, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  await postAt(botBase, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  const started = await postAt(botBase, `/api/rooms/${host.code}/start`, { clientId: host.clientId, bots: [{ id: 'bot2', name: 'Hye', kind: 'bot', difficulty: 'hard', personality: 'strategist' }] });
  assert.equal(started.status, 200);
  const roomResponse = await fetch(`${botBase}/api/rooms/${host.code}`);
  const room = await roomResponse.json();
  assert.deepEqual(room.players.map(p => p.name), ['Host', 'Guest', 'Hye']);
});


test('LAN joins are idempotent per client token and host cannot start before every human is ready', async t => {
  const p = 26000 + Math.floor(Math.random() * 10000);
  const baseUrl = `http://127.0.0.1:${p}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(p), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) { try { const r = await fetch(baseUrl); if (r.status === 404) break; } catch {} await new Promise(resolve => setTimeout(resolve, 80)); }
  const createdResponse = await postAt(baseUrl, '/api/rooms', { gameId: 'chess', clientToken: 'host-device', player: { name: 'Host' } });
  assert.equal(createdResponse.status, 200);
  const host = await createdResponse.json();
  const firstResponse = await postAt(baseUrl, `/api/rooms/${host.code}/join`, { gameId: 'chess', clientToken: 'guest-device', player: { name: 'Guest' } });
  assert.equal(firstResponse.status, 200);
  const guest = await firstResponse.json();
  const duplicateResponse = await postAt(baseUrl, `/api/rooms/${host.code}/join`, { gameId: 'chess', clientToken: 'guest-device', player: { name: 'Guest' } });
  assert.equal(duplicateResponse.status, 200);
  const duplicate = await duplicateResponse.json();
  assert.equal(duplicate.clientId, guest.clientId, 'retry returns the original player identity');
  assert.equal(duplicate.session.players.length, 2, 'retry does not create a duplicate lobby player');
  const notReady = await postAt(baseUrl, `/api/rooms/${host.code}/start`, { clientId: host.clientId });
  assert.equal(notReady.status, 409, 'host cannot start while humans are not ready');
  await postAt(baseUrl, `/api/rooms/${host.code}/message`, { clientId: host.clientId, message: { type: 'ready', ready: true } });
  const stillNotReady = await postAt(baseUrl, `/api/rooms/${host.code}/start`, { clientId: host.clientId });
  assert.equal(stillNotReady.status, 409, 'host cannot start before the guest is ready');
  await postAt(baseUrl, `/api/rooms/${host.code}/message`, { clientId: guest.clientId, message: { type: 'ready', ready: true } });
  const started = await postAt(baseUrl, `/api/rooms/${host.code}/start`, { clientId: host.clientId });
  assert.equal(started.status, 200, 'match starts after all humans are ready');
});


test('LAN host can switch the shared lobby game before start and all members receive the new session', async t => {
  const p = 27000 + Math.floor(Math.random() * 8000);
  const baseUrl = `http://127.0.0.1:${p}`;
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/lan-server.ts', '--port', String(p), '--host', '127.0.0.1'], { stdio: 'ignore' });
  t.after(() => { if (child && !child.killed) child.kill('SIGTERM'); });
  const end = Date.now() + 6000;
  while (Date.now() < end) { try { const r = await fetch(baseUrl); if (r.status === 404) break; } catch {} await new Promise(resolve => setTimeout(resolve, 80)); }
  const created = await postAt(baseUrl, '/api/rooms', { gameId: 'chess', player: { name: 'Host' } });
  const host = await created.json();
  const joinedResponse = await postAt(baseUrl, `/api/rooms/${host.code}/join`, { gameId: 'chess', player: { name: 'Guest' } });
  const guest = await joinedResponse.json();
  const forbidden = await postAt(baseUrl, `/api/rooms/${host.code}/switch-game`, { clientId: guest.clientId, gameId: 'ludo' });
  assert.equal(forbidden.status, 403, 'non-host cannot change the game');
  const switched = await postAt(baseUrl, `/api/rooms/${host.code}/switch-game`, { clientId: host.clientId, gameId: 'ludo' });
  assert.equal(switched.status, 200);
  const info = await (await fetch(`${baseUrl}/api/rooms/${host.code}`)).json();
  assert.equal(info.gameId, 'ludo');
  assert.equal(info.status, 'lobby');
});
