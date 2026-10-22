import { isValidWord } from '../../core/dictionary';
import type { Player } from '../../core/types';
import type { ScrambleRound, ScrambleState, ScrambleMove } from './types';

const PUZZLES = [
  'planet', 'garden', 'orange', 'silver', 'castle', 'friend', 'market', 'forest',
  'bridge', 'window', 'rocket', 'school', 'dragon', 'island', 'pencil', 'button',
  'thunder', 'picture', 'journey', 'holiday', 'library', 'diamond', 'monster', 'blanket',
];
const ROUND_LIMITS = [45_000, 45_000, 50_000, 55_000, 60_000];
// The shared offline dictionary is initialized by core/dictionary; keep puzzle answers separate.

function shuffleWord(word: string, salt = Math.random()): string {
  const a = word.split('');
  let seed = Math.floor(salt * 2_000_000_000) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out = a.join('');
  return out === word ? shuffleWord(word, (salt * 1.73) % 1) : out;
}

function chooseAnswer(round: number): string {
  const candidates = PUZZLES.filter(w => w.length >= 5 + Math.min(round - 1, 2));
  return candidates[Math.floor(Math.random() * candidates.length)] ?? PUZZLES[round % PUZZLES.length];
}

function makeRound(round: number): ScrambleRound {
  const answer = chooseAnswer(round);
  return { answer, letters: shuffleWord(answer), startedAt: Date.now(), limitMs: ROUND_LIMITS[round - 1] ?? 60_000 };
}

function nextPlayer(s: ScrambleState) { return (s.turn + 1) % s.playerIds.length; }
function log(s: ScrambleState, message: string) { return [...s.log.slice(-9), message]; }
function scoreFor(word: string, elapsedMs: number, limitMs: number, hints: number): number {
  const remaining = Math.max(0, Math.ceil((limitMs - elapsedMs) / 1000));
  return Math.max(1, word.length * 10 + remaining * 2 - hints * 15);
}

export function scrambleSetup(players: Player[]): ScrambleState {
  const answer = makeRound(1);
  return {
    playerIds: players.map(p => p.id), turn: 0, round: 1, totalRounds: 5,
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    solved: Object.fromEntries(players.map(p => [p.id, 0])),
    current: answer, hints: 0, hintLetter: '', skips: 0, log: [],
  };
}

export function scrambleCurrent(s: ScrambleState) { return s.playerIds[s.turn]; }

export function scrambleLegalMoves(s: ScrambleState, player: string) {
  if (player !== scrambleCurrent(s)) return [];
  return [
    { type: 'submit', player, payload: { action: 'submit', word: '', elapsedMs: Math.max(0, Date.now() - s.current.startedAt) } as ScrambleMove, ts: Date.now() },
    { type: 'hint', player, payload: { action: 'hint' } as ScrambleMove, ts: Date.now() },
    { type: 'skip', player, payload: { action: 'skip', elapsedMs: Math.max(0, Date.now() - s.current.startedAt) } as ScrambleMove, ts: Date.now() },
  ];
}

function sameLetters(a: string, b: string) {
  return a.toLowerCase().split('').sort().join('') === b.toLowerCase().split('').sort().join('');
}

export function scrambleValidate(s: ScrambleState, move: { player: string; payload: ScrambleMove }) {
  if (move.player !== scrambleCurrent(s)) return false;
  const nowElapsed = Math.max(0, Date.now() - s.current.startedAt);
  if (move.payload.action === 'hint') return s.hints < Math.max(0, s.current.answer.length - 1);
  if (move.payload.action === 'skip') return Number.isFinite(move.payload.elapsedMs) && move.payload.elapsedMs >= 0 && move.payload.elapsedMs <= s.current.limitMs + 2_000;
  const word = move.payload.word.trim().toLowerCase();
  const elapsed = Number.isFinite(move.payload.elapsedMs) ? move.payload.elapsedMs : nowElapsed;
  return elapsed >= 0 && elapsed <= s.current.limitMs + 2_000 &&
    word.length === s.current.answer.length && sameLetters(word, s.current.answer) && isValidWord(word);
}

export function scrambleApply(s: ScrambleState, move: { player: string; payload: ScrambleMove }): ScrambleState {
  const p = move.player;
  const action = move.payload.action;
  if (action === 'hint') return { ...s, hints: s.hints + 1, hintLetter: s.current.answer[Math.min(s.hints, s.current.answer.length - 1)] ?? '', scores: { ...s.scores, [p]: Math.max(0, s.scores[p] - 15) }, log: log(s, `${p} used a hint`) };

  const completed = action === 'submit';
  const gained = action === 'submit' ? scoreFor(move.payload.word.trim(), move.payload.elapsedMs, s.current.limitMs, s.hints) : 0;
  const solved = { ...s.solved, [p]: (s.solved[p] ?? 0) + (completed ? 1 : 0) };
  const scores = { ...s.scores, [p]: (s.scores[p] ?? 0) + gained };
  const isLast = s.round >= s.totalRounds && s.turn === s.playerIds.length - 1;
  const nextRound = s.turn === s.playerIds.length - 1 ? s.round + 1 : s.round;
  const next = isLast ? s : { ...s, round: nextRound, current: makeRound(Math.min(nextRound, s.totalRounds)), hints: 0, hintLetter: '', skips: action === 'skip' ? s.skips + 1 : s.skips, turn: nextPlayer(s), solved, scores };
  if (isLast) return { ...s, round: s.totalRounds + 1, solved, scores, skips: action === 'skip' ? s.skips + 1 : s.skips, log: log(s, action === 'submit' ? `${p} solved ${s.current.letters} for ${gained}` : `${p} skipped the final scramble`) };
  return { ...next, log: log(s, action === 'submit' ? `${p} solved ${s.current.letters}` : `${p} skipped the scramble`) };
}

export function scrambleOver(s: ScrambleState) {
  if (s.round <= s.totalRounds) return null;
  const winner = [...s.playerIds].sort((a, b) => (s.scores[b] ?? 0) - (s.scores[a] ?? 0))[0] ?? null;
  return { winner, reason: 'All scramble rounds completed', scores: s.scores };
}

export function scrambleBot(s: ScrambleState, player: string): { type: string; player: string; payload: ScrambleMove; ts: number } {
  const elapsed = Math.min(s.current.limitMs - 500, 5_000 + Math.random() * 12_000);
  const answer = s.current.answer;
  return { type: 'submit', player, payload: { action: 'submit', word: answer, elapsedMs: Math.max(0, elapsed) }, ts: Date.now() };
}
