// Coordinates for the exact 1000 x 1100 S&L.svg board.
// Playable grid: x=60..940, y=130..1010, 88px per square.
// These percentages are relative to the complete SVG, so the overlay
// stays aligned when the board scales responsively.

const BOARD_WIDTH = 1000;
const BOARD_HEIGHT = 1100;
const GRID_X = 60;
const GRID_Y = 130;
const CELL = 88;

export interface BoardPoint {
  left: number;
  top: number;
}

export const boardPoint = (col: number, rowFromTop: number): BoardPoint => ({
  left: ((GRID_X + col * CELL + CELL / 2) / BOARD_WIDTH) * 100,
  top: ((GRID_Y + rowFromTop * CELL + CELL / 2) / BOARD_HEIGHT) * 100,
});

function posToCell(pos: number): { row: number; col: number } {
  if (pos <= 0) return { row: 9, col: 0 };
  if (pos > 100) return { row: 0, col: 0 };

  const zero = pos - 1;
  const rowFromBottom = Math.floor(zero / 10);
  const inRow = zero % 10;
  const leftToRight = rowFromBottom % 2 === 0;

  return {
    row: 9 - rowFromBottom,
    col: leftToRight ? inRow : 9 - inRow,
  };
}

export const SQUARE_POS: Record<number, BoardPoint> = {};
for (let pos = 1; pos <= 100; pos += 1) {
  const { row, col } = posToCell(pos);
  SQUARE_POS[pos] = boardPoint(col, row);
}

// Position 0 is parked just below square 1, still inside the SVG frame.
export const OFF_BOARD: BoardPoint = {
  left: boardPoint(0, 9).left,
  top: 95.5,
};

export const SQUARE_CENTER = (pos: number): BoardPoint =>
  pos <= 0 ? OFF_BOARD : SQUARE_POS[Math.min(pos, 100)];

export const BOARD_ASPECT_RATIO = `${BOARD_WIDTH} / ${BOARD_HEIGHT}`;

import { SNAKES, LADDERS } from './types';

export function transitionAt(pos: number): {
  to: number;
  kind: 'snake' | 'ladder';
} | null {
  if (pos < 1 || pos > 100) return null;
  if (SNAKES[pos] !== undefined) return { to: SNAKES[pos], kind: 'snake' };
  if (LADDERS[pos] !== undefined) return { to: LADDERS[pos], kind: 'ladder' };
  return null;
}
