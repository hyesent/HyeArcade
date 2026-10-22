import { registerPlugin, Capacitor } from '@capacitor/core';
import type { GameSession, Player, Transport, TransportMessage } from './types';

export interface LanRoomInfo {
  code: string;
  clientId: string;
  session: GameSession;
  host: boolean;
  baseUrl?: string;
}

interface LanNativePlugin {
  start(): Promise<{ baseUrl: string; port: number }>;
  stop(): Promise<void>;
  discover(): Promise<{ hosts: { name: string; baseUrl: string }[] }>;
}

const LanHost = registerPlugin<LanNativePlugin>('LanHost');

export interface LanClient extends Transport {
  clientId: string;
  roomCode: string;
  connect(baseUrl: string, roomCode: string, clientId?: string): Promise<void>;
  createRoom(baseUrl: string, gameId: string, player: Player): Promise<LanRoomInfo>;
  joinRoom(baseUrl: string, gameId: string, roomCode: string, player: Player): Promise<LanRoomInfo>;
  start(boardId?: string, players?: Player[]): Promise<void>;
  pushSession(session: GameSession, views?: Record<string, GameSession>): Promise<void>;
  acceptMove(move: import('./types').Move): Promise<void>;
  getSession(): GameSession | null;
  isHost(): boolean;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `LAN request failed (${res.status})`);
  return data as T;
}

async function nativeHostUrl(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const result = await LanHost.start();
  return result.baseUrl;
}

async function discoverRoom(code: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) return '';
  const found = await LanHost.discover();
  for (const host of found.hosts) {
    try {
      const info = await json<{ code: string }>(`${host.baseUrl}/api/rooms/${code}`);
      if (info.code === code) return host.baseUrl;
    } catch { /* not our room */ }
  }
  throw new Error('Room not found on this Wi-Fi network. Make sure the host is online and both phones are on the same Wi-Fi.');
}

export function createLanClient(): LanClient {
  let base = '';
  let code = '';
  let id = '';
  let host = false;
  let session: GameSession | null = null;
  let es: EventSource | null = null;
  let lastSequence = 0;
  const listeners = new Set<(m: TransportMessage) => void>();
  const emit = (m: TransportMessage) => listeners.forEach((fn) => fn(m));
  let sending = Promise.resolve();
  const postMessage = async (message: TransportMessage) => {
    if (!base || !code || !id) return;
    const requestId = message.requestId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const outgoing = { ...message, requestId } as TransportMessage;
    const run = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await json<{ok:boolean;sequence?:number}>(`${base}/api/rooms/${code}/message`, {
            method: 'POST', body: JSON.stringify({ clientId: id, message: outgoing }),
          });
          return;
        } catch (error) {
          lastError = error;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 180 * (attempt + 1)));
        }
      }
      emit({ type: 'transport.error', message: lastError instanceof Error ? lastError.message : 'Message could not be delivered', ts: Date.now() });
      throw lastError;
    };
    // Preserve local send order so a burst of chat/reactions cannot overtake itself.
    const task = sending.then(run, run);
    sending = task.catch(() => undefined);
    return task;
  };

  const api = {
    get clientId() { return id; },
    get roomCode() { return code; },

    async connect(url: string, roomCode: string, clientId?: string) {
      base = url.replace(/\/$/, '');
      code = roomCode.toUpperCase();
      id = clientId ?? id;
      es?.close();
      es = new EventSource(`${base}/api/rooms/${code}/events?clientId=${encodeURIComponent(id)}`);
      es.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data) as TransportMessage;
          const seq = Number(m.sequence ?? 0);
          if (seq > 0 && lastSequence > 0 && seq > lastSequence + 1 && m.type !== 'session') {
            void postMessage({ type: 'resync_request', afterSequence: lastSequence }).catch(() => undefined);
          }
          if (seq > 0) lastSequence = Math.max(lastSequence, seq);
          if (m.type === 'session') session = m.session;
          if (m.type === 'host') host = m.player === id;
          emit(m);
        } catch { /* malformed event */ }
      };
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('LAN connection timeout')), 7000);
        const on = () => {
          window.clearTimeout(timer);
          es?.removeEventListener('open', on);
          resolve();
        };
        es?.addEventListener('open', on);
      });
    },

    async createRoom(url: string, gameId: string, player: Player) {
      if (Capacitor.isNativePlatform()) url = (await nativeHostUrl()) ?? url;
      const r = await json<LanRoomInfo>(`${url.replace(/\/$/, '')}/api/rooms`, {
        method: 'POST', body: JSON.stringify({ gameId, player }),
      });
      base = url.replace(/\/$/, ''); code = r.code; id = r.clientId; host = true; session = r.session;
      await api.connect(base, code, id);
      return { ...r, baseUrl: base };
    },

    async joinRoom(url: string, gameId: string, roomCode: string, player: Player) {
      const wanted = roomCode.trim().toUpperCase();
      if (!wanted) throw new Error('Enter a LAN room code.');
      if (Capacitor.isNativePlatform()) url = await discoverRoom(wanted);
      if (!url) throw new Error('Enter the host address.');
      const r = await json<LanRoomInfo>(`${url.replace(/\/$/, '')}/api/rooms/${wanted}/join`, {
        method: 'POST', body: JSON.stringify({ gameId, player }),
      });
      base = url.replace(/\/$/, ''); code = r.code; id = r.clientId; host = false; session = r.session;
      await api.connect(base, code, id);
      return { ...r, baseUrl: base };
    },

    async start(boardId?: string, players?: Player[]) {
      const bots = (players ?? []).filter(player => player.kind === 'bot');
      await json(`${base}/api/rooms/${code}/start`, { method: 'POST', body: JSON.stringify({ clientId: id, boardId, bots }) });
    },

    async acceptMove(move: import('./types').Move) {
      await postMessage({ type: 'move.accepted', move });
    },

    async pushSession(s: GameSession, views?: Record<string, GameSession>) {
      session = s;
      await json(`${base}/api/rooms/${code}/session`, {
        method: 'POST', body: JSON.stringify({ clientId: id, session: s, views }),
      });
    },

    getSession: () => session,
    isHost: () => host,
    send: (m: TransportMessage) => { void postMessage(m).catch(() => undefined); },
    onMessage: (cb: (m: TransportMessage) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    close: () => {
      es?.close(); es = null;
      if (host && Capacitor.isNativePlatform()) void LanHost.stop().catch(() => undefined);
    },
  } as LanClient;
  return api;
}

export function detectLanBaseUrl(port = 8787): string {
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}
