import type { GameSession, Player, Transport, TransportMessage, Move } from './types';
import type { LanClient, LanRoomInfo } from './lan';

export const ONLINE_API_BASE = 'https://hyearcade-api.onrender.com';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 65_000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((body as { detail?: string; error?: string }).detail ?? (body as { error?: string }).error ?? `Online request failed (${response.status})`);
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The online server took too long to respond. It may be waking up; please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function token(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface PublicOnlineRoom {
  code: string;
  gameId: string;
  players: number;
  maxPlayers: number;
  status: string;
  hostName: string;
  hostOnline: boolean;
  createdAt: number;
}

export async function listOnlineRooms(gameId?: string): Promise<PublicOnlineRoom[]> {
  const suffix = gameId ? `?gameId=${encodeURIComponent(gameId)}` : '';
  const result = await request<{ rooms: PublicOnlineRoom[] }>(`${ONLINE_API_BASE}/api/rooms${suffix}`);
  return result.rooms ?? [];
}

export function createOnlineClient(): LanClient {
  let base = ONLINE_API_BASE;
  let code = '';
  let id = '';
  let host = false;
  let session: GameSession | null = null;
  let es: EventSource | null = null;
  let lastSequence = 0;
  const listeners = new Set<(message: TransportMessage) => void>();
  const clientToken = token();
  let sending = Promise.resolve();
  const emit = (message: TransportMessage) => listeners.forEach(listener => listener(message));

  const postMessage = async (message: TransportMessage) => {
    if (!code || !id) throw new Error('Not connected to an online room.');
    const outgoing = { ...message, requestId: message.requestId ?? token() } as TransportMessage;
    const run = async () => {
      const result = await request<{ ok: boolean; sequence?: number }>(`${base}/api/rooms/${code}/message`, {
        method: 'POST', body: JSON.stringify({ clientId: id, message: outgoing }),
      });
      return result;
    };
    const task = sending.then(run, run);
    sending = task.then(() => undefined, () => undefined);
    return task;
  };

  const api: LanClient = {
    get clientId() { return id; },
    get roomCode() { return code; },
    async connect(url: string, roomCode: string, clientId?: string) {
      base = (url || ONLINE_API_BASE).replace(/\/$/, '');
      code = roomCode.toUpperCase();
      if (clientId) id = clientId;
      if (!id) throw new Error('Missing online player identity.');
      es?.close();
      es = new EventSource(`${base}/api/rooms/${code}/events?clientId=${encodeURIComponent(id)}${lastSequence ? `&afterSequence=${lastSequence}` : ''}`);
      es.onmessage = event => {
        try {
          const message = JSON.parse(event.data) as TransportMessage;
          const sequence = Number(message.sequence ?? 0);
          if (sequence > 0) lastSequence = Math.max(lastSequence, sequence);
          if (message.type === 'session') session = message.session;
          if (message.type === 'host') host = message.player === id;
          emit(message);
        } catch { /* Ignore malformed server events. */ }
      };
      await new Promise<void>((resolve, reject) => {
        const current = es;
        if (!current) return reject(new Error('Could not open online connection.'));
        const timer = window.setTimeout(() => reject(new Error('The online room connection timed out. Please retry.')), 65_000);
        const onOpen = () => { window.clearTimeout(timer); current.removeEventListener('open', onOpen); resolve(); };
        current.addEventListener('open', onOpen);
        current.onerror = () => {
          if (current.readyState === EventSource.CLOSED) {
            window.clearTimeout(timer);
            reject(new Error('Connection to the online room was lost.'));
          }
        };
      });
    },
    async createRoom(_url: string, gameId: string, player: Player) {
      base = ONLINE_API_BASE;
      const room = await request<LanRoomInfo>(`${base}/api/rooms`, {
        method: 'POST', body: JSON.stringify({ gameId, player, clientToken }),
      });
      code = room.code; id = room.clientId; host = true; session = room.session;
      await api.connect(base, code, id);
      return { ...room, baseUrl: base };
    },
    async joinRoom(_url: string, gameId: string, roomCode: string, player: Player) {
      base = ONLINE_API_BASE;
      const wanted = roomCode.trim().toUpperCase();
      if (!wanted) throw new Error('Enter an online room code.');
      const room = await request<LanRoomInfo>(`${base}/api/rooms/${wanted}/join`, {
        method: 'POST', body: JSON.stringify({ gameId, player, clientToken }),
      });
      code = room.code; id = room.clientId; host = false; session = room.session;
      await api.connect(base, code, id);
      return { ...room, baseUrl: base };
    },
    async start(boardId?: string, players?: Player[]) {
      const bots = (players ?? []).filter(player => player.kind === 'bot');
      await request(`${base}/api/rooms/${code}/start`, { method: 'POST', body: JSON.stringify({ clientId: id, boardId, bots }) });
    },
    async setReady(ready: boolean) {
      const result = await request<{ ok: boolean; ready: boolean }>(`${base}/api/rooms/${code}/message`, {
        method: 'POST', body: JSON.stringify({ clientId: id, message: { type: 'ready', ready, requestId: token() } }),
      });
      if (result.ready !== ready) throw new Error('The online room did not confirm your readiness.');
      if (session) {
        session = { ...session, players: session.players.map(player => player.id === id ? { ...player, ready } : player) };
        emit({ type: 'session', session });
      }
    },
    async switchGame(gameId: string) {
      await request(`${base}/api/rooms/${code}/switch-game`, { method: 'POST', body: JSON.stringify({ clientId: id, gameId }) });
    },
    async pushSession(next: GameSession, views?: Record<string, GameSession>) {
      session = next;
      await request(`${base}/api/rooms/${code}/session`, { method: 'POST', body: JSON.stringify({ clientId: id, session: next, views }) });
    },
    async acceptMove(move: Move) { await postMessage({ type: 'move.accepted', move }); },
    getSession: () => session,
    isHost: () => host,
    send(message: TransportMessage) { void postMessage(message).catch(error => emit({ type: 'transport.error', message: error instanceof Error ? error.message : 'Online message failed', ts: Date.now() })); },
    onMessage(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    close() { es?.close(); es = null; },
  } as LanClient & Transport;
  return api;
}
