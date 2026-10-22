import snakeLadder from './snake-ladder.svg';

export const BOARDS = {
  'snake-ladder': snakeLadder,
} as const;

export type BoardId = keyof typeof BOARDS;
