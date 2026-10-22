import type { Color } from './types';

export const GRID = 15;

// A cell in the 15x15 grid: [row, col] with row 0 at top
export type Cell = [number, number];

// -------------------------------------------------------------
// RING PATH (52 cells, clockwise)
// Start positions on the ring per the supplied reference PNG:
//   R (Red)    starts on the left arm
//   G (Green)  starts on the top arm
//   Y (Yellow) starts on the right arm
//   B (Blue)   starts on the bottom arm
// -------------------------------------------------------------

// The 52 cells of the ring, in clockwise order.
// Red's start is index 0. Coordinates traced from the standard board.
export const RING: Cell[] = [
  // Red start is the left arm; travel clockwise toward the center and then upward
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],   // 0-4  (Red start at 0)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],  // 5-10
  [0, 7],                                    // 11  (top-left corner)
  [0, 8],                                    // 12
  // Green start is the upper arm; continue clockwise toward the right
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],   // 13-17  (Blue start at 13)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],  // 18-23
  [7, 14],                                   // 24  (top-right corner)
  [8, 14],                                   // 25
  // Yellow start is the right arm; continue clockwise toward the bottom
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],  // 26-30  (Green start at 26)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],  // 31-36
  [14, 7],                                   // 37  (bottom-right corner)
  [14, 6],                                   // 38
  // Blue start is the lower arm; continue clockwise toward the left
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],  // 39-43  (Yellow start at 39)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],  // 44-49
  [7, 0],                                    // 50  (bottom-left corner)
  [6, 0],                                    // 51
];

// Home column cells (5 per color), leading from the ring to center
export const HOME_COL: Record<Color, Cell[]> = {
  R: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  G: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  Y: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  B: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

// Yard slots (4 per color) — where pawns wait before entering the ring.
// Asset calibration note: ludo.png is 1254×1254, but the actual board grid
// ends around y=1203, leaving a ~51px blank strip at the bottom. The x-grid
// spans about 1230px and the y-grid about 1195px. Use separate axes below;
// assuming a square 1237px grid visibly pushed pawns down the board.
export const YARD: Record<Color, Cell[]> = {
  R: [[1.62, 1.60], [1.62, 3.30], [3.42, 1.60], [3.42, 3.30]],
  G: [[1.62, 10.63], [1.62, 12.39], [3.42, 10.63], [3.42, 12.39]],
  Y: [[10.58, 10.63], [10.58, 12.39], [12.40, 10.63], [12.40, 12.39]],
  B: [[10.58, 1.60], [10.58, 3.30], [12.40, 1.60], [12.40, 3.30]],
};

// Convert a logical 15x15 board cell to a percentage position using the
// measured geometry of src/assets/boards/ludo.png (not a generic 15x15 box).
export function cellToPercent(cell: Cell): { left: number; top: number } {
  const imageSize = 1254;
  const gridOriginX = 8;
  const gridOriginY = 8;
  const gridSpanX = 1230;
  const gridSpanY = 1195;
  const cellSizeX = gridSpanX / GRID;
  const cellSizeY = gridSpanY / GRID;
  return {
    left: ((gridOriginX + (cell[1] + 0.5) * cellSizeX) / imageSize) * 100,
    top: ((gridOriginY + (cell[0] + 0.5) * cellSizeY) / imageSize) * 100,
  };
}

// Convert a pawn's step (0..51 ring, 52..56 home col, 57 finished) to a cell
export function pawnCell(
  color: Color,
  step: number,
  pawnId: number,
  state: 'yard' | 'ring' | 'home-col' | 'finished',
  startStep: number,
): Cell {
  if (state === 'yard') return YARD[color][pawnId];
  if (state === 'finished') {
    const finishOffsets: Cell[] = [[6.72, 7], [7, 6.72], [7.28, 7], [7, 7.28]];
    return finishOffsets[pawnId % finishOffsets.length];
  }
  if (state === 'home-col') {
    const colIdx = step - 52;
    return HOME_COL[color][colIdx] ?? HOME_COL[color][4];
  }
  // ring
  const ringIdx = (startStep + step) % 52;
  return RING[ringIdx];
}