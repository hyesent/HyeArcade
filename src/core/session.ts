import type { GameSession } from './types';

const STORAGE_PREFIX = 'hye:session:';

export function saveSession(session: GameSession): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + session.id, JSON.stringify(session));
    const index = listSessionIds();
    if (!index.includes(session.id)) {
      index.push(session.id);
      localStorage.setItem('hye:sessions', JSON.stringify(index));
    }
  } catch {
    // storage full or unavailable — ignore silently
  }
}

export function loadSession<T = unknown>(id: string): GameSession<T> | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as GameSession<T>;
  } catch {
    return null;
  }
}

export function deleteSession(id: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + id);
    const index = listSessionIds().filter((s) => s !== id);
    localStorage.setItem('hye:sessions', JSON.stringify(index));
  } catch {
    // ignore
  }
}

export function listSessionIds(): string[] {
  try {
    const raw = localStorage.getItem('hye:sessions');
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function listSessions(): GameSession[] {
  return listSessionIds()
    .map((id) => loadSession(id))
    .filter((s): s is GameSession => s !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}