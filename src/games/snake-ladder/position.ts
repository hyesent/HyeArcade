// Single source of truth for the 10x10 Snake & Ladder coordinate system.
// row 0 is the top row, row 9 is the bottom row.

export interface Cell {
  row: number;
  col: number;
}

export function positionToCell(pos: number): Cell {
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

export const cellFromPosition = positionToCell;

export function squareFromCell(row: number, col: number): number {
  if (row < 0 || row > 9 || col < 0 || col > 9) return 0;
  const rowFromBottom = 9 - row;
  const inRow = rowFromBottom % 2 === 0 ? col : 9 - col;
  return rowFromBottom * 10 + inRow + 1;
}
