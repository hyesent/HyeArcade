import type { PlayerId } from '../../core/types';

export type ChessColor = 'w' | 'b';
export type ChessPiece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type ChessPromotion = 'q' | 'r' | 'b' | 'n';
export type ChessSquare = string;

export interface ChessBoardMove { from: ChessSquare; to: ChessSquare; promotion?: ChessPromotion }
export type ChessMovePayload = ChessBoardMove & { action?: 'move' } | { action: 'resign' | 'claim-draw' };

export interface ChessMoveRecord extends ChessBoardMove {
  san: string;
  color: ChessColor;
  captured?: ChessPiece;
}

export interface ChessState {
  whitePlayer: PlayerId;
  blackPlayer: PlayerId;
  board: (ChessPiece | null)[][];
  colors: (ChessColor | null)[][];
  turn: ChessColor;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: string | null;
  halfmove: number;
  fullmove: number;
  history: ChessMoveRecord[];
  positionHistory: string[];
  lastMove: ChessMoveRecord | null;
  check: ChessColor | null;
  winner: ChessColor | null;
  drawReason: string | null;
  claimableDraw: string | null;
}
