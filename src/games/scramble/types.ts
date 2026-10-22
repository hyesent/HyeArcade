export interface ScrambleRound {
  answer: string;
  letters: string;
  startedAt: number;
  limitMs: number;
}

export interface ScrambleState {
  playerIds: string[];
  turn: number;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
  solved: Record<string, number>;
  current: ScrambleRound;
  hints: number;
  hintLetter?: string;
  skips: number;
  log: string[];
}

export type ScrambleMove =
  | { action: 'submit'; word: string; elapsedMs: number }
  | { action: 'hint' }
  | { action: 'skip'; elapsedMs: number };
