// ---------- Players ----------

export type PlayerId = string;

export type PlayerKind = 'human' | 'bot' | 'remote';

export interface Player {
  id: PlayerId;
  /** Stable device-local profile identity. LAN uses a separate ephemeral player id. */
  profileId?: string;
  name: string;
  kind: PlayerKind;
  seat: number;
  connected: boolean;
  difficulty?: BotDifficulty;
  /** Optional social style used for bot reactions and preset chat. */
  personality?: BotPersonality;
}

// ---------- Bots ----------

export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type BotPersonality = 'friendly' | 'rival' | 'strategist' | 'quiet';

// ---------- Moves ----------

export interface Move<P = unknown> {
  type: string;
  player: PlayerId;
  payload: P;
  ts: number;
  /** Human-readable result captured at dispatch time for clear match history. */
  summary?: string;
}

// ---------- Path (for animation) ----------

export type PathStep = {
  x: number;
  y: number;
  hop?: boolean;
};

export type MovePath = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  steps: PathStep[];
  style: 'hop' | 'slide' | 'arc' | 'climb' | 'descend' | 'flip';
  sound?: string;
  soundPerStep?: boolean;
};

// ---------- Result ----------

export interface GameResult {
  winner: PlayerId | null;
  reason: string;
  scores?: Record<PlayerId, number>;
  hyeEarned?: Record<PlayerId, number>;
  pointsEarned?: Record<PlayerId, number>;
}

// ---------- Game Definition ----------

export interface GameDefinition<S = unknown, M = unknown> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;

  icon: string;
  color: string;
  tags: string[];
  featured?: boolean;

  supports: {
    bots: boolean;
    lan: boolean;
    passAndPlay: boolean;
    solo?: boolean;
    currency?: boolean;
  };

  boards?: { id: string; name: string }[];

  setup(players: Player[], boardId?: string): S;

  currentPlayer(state: S): PlayerId;

  legalMoves(state: S, player: PlayerId): Move<M>[];

  validate(state: S, move: Move<M>): boolean;

  apply(state: S, move: Move<M>): S;

  isOver(state: S): GameResult | null;

  bot?(state: S, player: PlayerId, difficulty: BotDifficulty): Move<M>;

  view?(state: S, forPlayer: PlayerId): S;

  /** Explicitly allow narrowly-scoped responses that do not belong to the active turn. */
  allowOutOfTurn?(state: S, move: Move<M>): boolean;

  path?(state: S, move: Move<M>): MovePath | null;
}

// ---------- Session ----------

export type SessionStatus = 'lobby' | 'playing' | 'finished';

export interface GameSession<S = unknown> {
  id: string;
  gameId: string;
  boardId?: string;
  players: Player[];
  state: S;
  history: Move[];
  status: SessionStatus;
  result: GameResult | null;
  createdAt: number;
  updatedAt: number;
  /** Original setup snapshot used to inspect or replay the match event log. */
  initialState?: S;
}

// ---------- Transport ----------

export type TransportMessage = (
  | { type: 'session'; session: GameSession }
  | { type: 'move'; move: Move }
  | { type: 'move.accepted'; move: Move }
  | { type: 'move.rejected'; player: PlayerId; message: string }
  | { type: 'chat'; player: PlayerId; text: string; ts: number; presetId?: string }
  | { type: 'emote'; player: PlayerId; emoji: string; ts: number }
  | { type: 'join'; player: Player }
  | { type: 'leave'; player: PlayerId }
  | { type: 'host'; player: PlayerId }
  | { type: 'transport.error'; message: string; ts: number }
  | { type: 'resync_request'; afterSequence: number }
) & { version?: 1; sequence?: number; eventId?: string; requestId?: string; senderId?: PlayerId };

export interface Transport {
  send(msg: TransportMessage): void;
  onMessage(cb: (msg: TransportMessage) => void): () => void;
  close(): void;
}