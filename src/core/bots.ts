import type {
  BotDifficulty,
  GameDefinition,
  GameSession,
  Move,
} from './types';
import { dispatch } from './engine';

export interface BotRunner {
  stop(): void;
}

export function startBotRunner<S, M>(
  def: GameDefinition<S, M>,
  getSession: () => GameSession<S>,
  setSession: (s: GameSession<S>) => void,
  onMove?: (move: Move<M>) => void,
): BotRunner {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSessionKey = '';

  const scheduleNext = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, ms);
  };

  const tick = () => {
    if (stopped) return;

    const session = getSession();

    // Stop if game is over
    if (session.status !== 'playing') {
      scheduleNext(500);
      return;
    }

    const currentId = def.currentPlayer(session.state);
    const current = session.players.find((p) => p.id === currentId);

    // Not a bot's turn — wait
    if (!current || current.kind !== 'bot' || !def.bot) {
      scheduleNext(250);
      return;
    }

    // Debounce: same state seen twice? skip duplicate dispatch
    const key = `${session.updatedAt}:${session.history.length}:${currentId}`;
    if (key === lastSessionKey) {
      scheduleNext(250);
      return;
    }
    lastSessionKey = key;

    const delay = getBotDelay(current.difficulty ?? 'medium');

    scheduleNext(delay);

    // Replace the scheduled tick with an immediate "do the move" call
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (stopped) return;

      // Re-read session in case it changed during the delay
      const fresh = getSession();
      if (fresh.status !== 'playing') {
        scheduleNext(250);
        return;
      }

      const freshCurrent = def.currentPlayer(fresh.state);
      const freshPlayer = fresh.players.find((p) => p.id === freshCurrent);
      if (!freshPlayer || freshPlayer.kind !== 'bot' || !def.bot) {
        scheduleNext(250);
        return;
      }

      try {
        const move = def.bot(fresh.state, freshPlayer.id, freshPlayer.difficulty ?? 'medium');

        // Validate before dispatching — bot must produce a legal move
        if (!def.validate(fresh.state, move)) {
          scheduleNext(500);
          return;
        }

        const next = dispatch(def, fresh, move);
        setSession(next);
        onMove?.(move);
      } catch {
        // Bot failed — wait and retry rather than wedge
      }

      scheduleNext(200);
    }, delay);
  };

  // Kick off
  scheduleNext(300);

  return {
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

function getBotDelay(difficulty: BotDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 700 + Math.random() * 500;
    case 'medium':
      return 900 + Math.random() * 600;
    case 'hard':
      return 500 + Math.random() * 400;
  }
}