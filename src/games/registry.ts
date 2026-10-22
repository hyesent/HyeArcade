import type { GameDefinition } from '../core/types';

import { ticTacToe } from './tic-tac-toe';
import { connectFour } from './connect-four';
import { gomoku } from './gomoku';
import { snakeLadder } from './snake-ladder';
import { ludo } from './ludo';
import { drafts } from './drafts';
import { checkers } from './checkers';
import { crazyEights } from './crazy-eights';
import { uno } from './uno';
import { whot } from './whot';
import { solitaire } from './solitaire';
import { mahjongSolitaire } from './mahjong-solitaire';
import { monopoly } from './advanced';
import { monopolyDeal } from './monopoly-deal';
import { scramble } from './scramble';
import { treasureHunt } from './treasure-hunt';
import { chess } from './chess';
import { pirateGo } from './pirate-go';
import { scrabble } from './scrabble';
import { mahjong } from './mahjong';
import { vitaMahjong } from './vita-mahjong';
import { ayo } from './ayo';
import { dominoes } from './dominoes';
import { othello } from './othello';
import { backgammon } from './backgammon';
import { battleship } from './battleship';
import { game2048 } from './2048';
import { minesweeper } from './minesweeper';
import { sudoku } from './sudoku';
import { memoryMatch } from './memory-match';
import { hearts } from './hearts';
import { hangman } from './hangman';

// Only games backed by a real rules engine are exposed in the playable catalogue.
export const GAMES: GameDefinition<unknown, unknown>[] = [
  ticTacToe,
  connectFour,
  gomoku,
  snakeLadder,
  ludo,
  drafts,
  checkers,
  crazyEights,
  uno,
  whot,
  solitaire,
  mahjongSolitaire,
  monopoly,
  monopolyDeal,
  scramble,
  treasureHunt,
  chess,
  pirateGo,
  scrabble,
  mahjong,
  vitaMahjong,
  ayo,
  dominoes,
  othello,
  backgammon,
  battleship,
  game2048,
  minesweeper,
  sudoku,
  memoryMatch,
  hearts,
  hangman,
] as unknown as GameDefinition<unknown, unknown>[];

export function getGame(id: string): GameDefinition<unknown, unknown> | undefined {
  return GAMES.find((g) => g.id === id);
}
