import type { GameDefinition } from '../../core/types';
import type { MahjongSolitaireState } from './types';
import { buildTiles } from './layout';
import { canMatch, isFree, isSolved } from './logic';

export type MahjongSolitaireMove = { a: string; b: string };

export const mahjongSolitaire: GameDefinition<
  MahjongSolitaireState,
  MahjongSolitaireMove
> = {
  id: 'mahjong-solitaire',
  name: 'Mahjong Solitaire',
  minPlayers: 1,
  maxPlayers: 1,

  icon: 'mahjong-solitaire',
  color: '#E8B95C',
  tags: ['tile', 'board', 'classic', 'solo'],

  supports: {
    bots: false,
    lan: false,
    passAndPlay: false,
    solo: true,
  },

  setup(players) {
    return {
      playerId: players[0]?.id ?? 'solo',
      tiles: buildTiles(),
      selected: null,
      movesLeft: 0,
      matches: 0,
    };
  },

  currentPlayer(state) {
    return state.playerId;
  },

  legalMoves(state) {
    const free = state.tiles.filter((t) => isFree(t, state.tiles));
    const moves: MahjongSolitaireMove[] = [];
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) {
          moves.push({ a: free[i].id, b: free[j].id });
        }
      }
    }
    return moves.map((m) => ({
      type: 'match',
      player: state.playerId,
      payload: m,
      ts: Date.now(),
    }));
  },

  validate(state, move) {
    const { a, b } = move.payload;
    const ta = state.tiles.find((t) => t.id === a);
    const tb = state.tiles.find((t) => t.id === b);
    if (!ta || !tb) return false;
    if (!isFree(ta, state.tiles) || !isFree(tb, state.tiles)) return false;
    return canMatch(ta, tb);
  },

  apply(state, move) {
    const { a, b } = move.payload;
    const tiles = state.tiles.map((t) =>
      t.id === a || t.id === b ? { ...t, removed: true } : t,
    );
    return {
      ...state,
      tiles,
      selected: null,
      matches: state.matches + 1,
    };
  },

  isOver(state) {
    if (isSolved(state.tiles)) {
      return {
        winner: state.playerId,
        reason: 'Board cleared',
        pointsEarned: { [state.playerId]: 500 },
      };
    }
    // Stuck?
    const free = state.tiles.filter((t) => isFree(t, state.tiles));
    let hasMatch = false;
    outer: for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) {
          hasMatch = true;
          break outer;
        }
      }
    }
    if (!hasMatch) {
      return {
        winner: null,
        reason: 'No moves left',
        pointsEarned: { [state.playerId]: 100 },
      };
    }
    return null;
  },
};

export { MahjongSolitaireBoard } from './MahjongSolitaire';
export type { MahjongSolitaireState };