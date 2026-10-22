import type { GameDefinition, Move } from '../../core/types';
import type { VitaMahjongState, VitaTile } from './types';
import { buildVitaTiles, shuffleVitaTiles } from './layout';
import { canEnterTray, canMatch, findMatches, isFree, isSolved, trayHasMatch } from './logic';

export type VitaMahjongMove =
  | { action: 'tap'; tileId: string }
  | { action: 'undo' }
  | { action: 'shuffle'; seed: number }
  | { action: 'hint' };

const move = (player: string, payload: VitaMahjongMove): Move<VitaMahjongMove> => ({ type: payload.action, player, payload, ts: Date.now() });

function snapshot(state: VitaMahjongState) {
  return { tiles: state.tiles.map(t => ({ ...t })), tray: [...state.tray], matches: state.matches, combo: state.combo, bestCombo: state.bestCombo, score: state.score };
}

export const vitaMahjong: GameDefinition<VitaMahjongState, VitaMahjongMove> = {
  id: 'vita-mahjong', name: 'Vita Mahjong', minPlayers: 1, maxPlayers: 1,
  icon: 'mahjong-solitaire', color: '#5BC7A7', tags: ['tile', 'puzzle', 'solo', 'mahjong', 'tray'],
  supports: { bots: false, lan: false, passAndPlay: false, solo: true },
  setup(players) {
    return { playerId: players[0]?.id ?? 'solo', tiles: buildVitaTiles(), tray: [], selected: null, hintPair: null, matches: 0, combo: 0, bestCombo: 0, score: 0, hints: 3, shuffles: 2, history: [] };
  },
  currentPlayer: s => s.playerId,
  legalMoves(state) {
    const p = state.playerId;
    const taps = state.tiles
      .filter(t => !t.removed && !t.inTray && isFree(t, state.tiles) && canEnterTray(t, state.tray, state.tiles))
      .map(t => move(p, { action: 'tap', tileId: t.id }));
    const moves = taps;
    if (state.history.length) moves.push(move(p, { action: 'undo' }));
    if (state.shuffles > 0) moves.push(move(p, { action: 'shuffle', seed: Date.now() }));
    if (state.hints > 0 && (findMatches(state.tiles).length || state.tray.length)) moves.push(move(p, { action: 'hint' }));
    return moves;
  },
  validate(state, action) {
    const m = action.payload;
    if (m.action === 'undo') return state.history.length > 0;
    if (m.action === 'shuffle') return state.shuffles > 0 && state.tiles.some(t => !t.removed && !t.inTray);
    if (m.action === 'hint') return state.hints > 0 && (findMatches(state.tiles).length > 0 || state.tray.length > 0);
    const tile = state.tiles.find(t => t.id === m.tileId);
    return !!tile && !tile.removed && !tile.inTray && isFree(tile, state.tiles) && canEnterTray(tile, state.tray, state.tiles);
  },
  apply(state, action) {
    const m = action.payload;
    if (m.action === 'undo') {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      return { ...state, tiles: previous.tiles.map(t => ({ ...t })), tray: [...previous.tray], matches: previous.matches, combo: previous.combo, bestCombo: previous.bestCombo, score: previous.score, selected: null, hintPair: null, history: state.history.slice(0, -1) };
    }
    if (m.action === 'hint') {
      const boardPair = findMatches(state.tiles)[0];
      if (boardPair) return { ...state, hints: Math.max(0, state.hints - 1), hintPair: boardPair };
      const trayTile = state.tray.map(id => state.tiles.find(t => t.id === id)).find((t): t is VitaTile => !!t);
      if (trayTile) {
        const partner = state.tiles.find(t => !t.removed && !t.inTray && isFree(t, state.tiles) && canMatch(trayTile, t));
        if (partner) return { ...state, hints: Math.max(0, state.hints - 1), hintPair: [trayTile.id, partner.id] };
      }
      return { ...state, hints: Math.max(0, state.hints - 1), hintPair: null };
    }
    const history = [...state.history, snapshot(state)];
    if (m.action === 'shuffle') {
      return { ...state, tiles: shuffleVitaTiles(state.tiles, m.seed), selected: null, hintPair: null, shuffles: state.shuffles - 1, history };
    }

    const tile = state.tiles.find(t => t.id === m.tileId);
    if (!tile || tile.removed || tile.inTray || !isFree(tile, state.tiles) || !canEnterTray(tile, state.tray, state.tiles)) return state;
    const partnerId = trayHasMatch(tile, state.tray, state.tiles);
    if (partnerId) {
      const newTray = state.tray.filter(id => id !== partnerId);
      const tiles = state.tiles.map(t => {
        if (t.id === tile.id || t.id === partnerId) return { ...t, inTray: false, removed: true };
        return t;
      });
      const combo = state.combo + 1;
      const comboBonus = Math.max(0, combo - 1) * 25;
      return { ...state, tiles, tray: newTray, selected: null, hintPair: null, matches: state.matches + 1, combo, bestCombo: Math.max(state.bestCombo, combo), score: state.score + 100 + comboBonus, history };
    }
    return { ...state, tiles: state.tiles.map(t => t.id === tile.id ? { ...t, inTray: true } : t), tray: [...state.tray, tile.id], selected: null, hintPair: null, combo: 0, history };
  },
  isOver(state) {
    if (isSolved(state.tiles, state.tray)) return { winner: state.playerId, reason: 'Board cleared', pointsEarned: { [state.playerId]: 500 + state.matches * 10 + state.score } };
    const legal = state.tiles.some(t => !t.removed && !t.inTray && isFree(t, state.tiles) && canEnterTray(t, state.tray, state.tiles));
    if (!legal && state.shuffles <= 0) return { winner: null, reason: 'Four-slot tray is blocked', pointsEarned: { [state.playerId]: 100 + state.matches * 5 } };
    return null;
  },
};

export { VitaMahjongBoard } from './VitaMahjong';
