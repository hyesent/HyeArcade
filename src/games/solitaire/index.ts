import type { GameDefinition, Player } from '../../core/types';
import type { SolitaireState, SolitaireMove } from './types';
import { solitaireBot } from './bot';
import {
  deal,
  canStackFoundation,
  canStackTableau,
  isValidRun,
  isWon,
} from './logic';

export const solitaire: GameDefinition<SolitaireState, SolitaireMove> = {
  id: 'solitaire',
  name: 'Solitaire',
  minPlayers: 1,
  maxPlayers: 1,

  icon: 'solitaire',
  color: '#4FD1A0',
  tags: ['card', 'classic', 'solo'],

  supports: {
    bots: false,
    lan: false,
    passAndPlay: false,
    solo: true,
  },

  setup(players: Player[]) {
    return deal(players[0]?.id ?? 'solo');
  },

  currentPlayer(state) {
    return state.playerId ?? 'solo';
  },

  legalMoves(state, player) {
    if (player !== state.playerId) return [];
    const moves: SolitaireMove[] = [];
    if (state.stock.length > 0) moves.push({ type: 'draw' });
    else if (state.waste.length > 0) moves.push({ type: 'recycle' });

    const wasteTop = state.waste[state.waste.length - 1];
    if (wasteTop) {
      state.foundations.forEach((f, i) => {
        if (canStackFoundation(wasteTop, f[f.length - 1])) moves.push({ type: 'waste-to-foundation', foundationIdx: i });
      });
      state.tableau.forEach((col, i) => {
        if (canStackTableau(wasteTop, col[col.length - 1])) moves.push({ type: 'waste-to-tableau', tableauIdx: i });
      });
    }

    state.tableau.forEach((col, fromIdx) => {
      if (!col.length) return;
      const top = col[col.length - 1];
      if (top.faceUp) {
        state.foundations.forEach((f, foundationIdx) => {
          if (canStackFoundation(top, f[f.length - 1])) moves.push({ type: 'tableau-to-foundation', tableauIdx: fromIdx, foundationIdx });
        });
      }
      for (let cardIdx = 0; cardIdx < col.length; cardIdx++) {
        const moving = col.slice(cardIdx);
        if (!isValidRun(moving)) continue;
        state.tableau.forEach((dest, toIdx) => {
          if (fromIdx !== toIdx && canStackTableau(moving[0], dest[dest.length - 1])) {
            moves.push({ type: 'tableau-to-tableau', fromIdx, cardIdx, toIdx });
          }
        });
      }
    });

    return moves.map((m) => ({ type: 'play', player: state.playerId, payload: m, ts: Date.now() }));
  },

  validate(state, move) {
    if (move.player !== state.playerId) return false;
    const p = move.payload;
    if (p.type === 'draw') return state.stock.length > 0;
    if (p.type === 'recycle') return state.stock.length === 0 && state.waste.length > 0;
    if (p.type === 'waste-to-foundation') {
      const card = state.waste[state.waste.length - 1];
      const f = state.foundations[p.foundationIdx];
      return !!card && !!f && canStackFoundation(card, f[f.length - 1]);
    }
    if (p.type === 'waste-to-tableau') {
      const card = state.waste[state.waste.length - 1];
      const col = state.tableau[p.tableauIdx];
      return !!card && !!col && canStackTableau(card, col[col.length - 1]);
    }
    if (p.type === 'tableau-to-foundation') {
      const col = state.tableau[p.tableauIdx];
      const card = col?.[col.length - 1];
      const f = state.foundations[p.foundationIdx];
      return !!card && !!f && card.faceUp && canStackFoundation(card, f[f.length - 1]);
    }
    if (p.type === 'tableau-to-tableau') {
      if (p.fromIdx === p.toIdx) return false;
      const from = state.tableau[p.fromIdx];
      const to = state.tableau[p.toIdx];
      if (!from || !to || p.cardIdx < 0 || p.cardIdx >= from.length) return false;
      const moving = from.slice(p.cardIdx);
      return isValidRun(moving) && canStackTableau(moving[0], to[to.length - 1]);
    }
    return false;
  },

  apply(state, move) {
    const p = move.payload;
    const next: SolitaireState = JSON.parse(JSON.stringify(state));
    next.moves++;

    if (p.type === 'draw') {
      if (next.stock.length > 0) {
        const card = next.stock.pop()!;
        card.faceUp = true;
        next.waste.push(card);
      }
      return next;
    }

    if (p.type === 'recycle') {
      while (next.waste.length > 0) {
        const card = next.waste.pop()!;
        card.faceUp = false;
        next.stock.push(card);
      }
      return next;
    }

    if (p.type === 'waste-to-foundation') {
      const card = next.waste.pop();
      if (!card || !next.foundations[p.foundationIdx]) return state;
      next.foundations[p.foundationIdx].push(card);
      return next;
    }

    if (p.type === 'tableau-to-foundation') {
      const col = next.tableau[p.tableauIdx];
      const foundation = next.foundations[p.foundationIdx];
      if (!col || !foundation || !col.length) return state;
      const card = col.pop()!;
      foundation.push(card);
      if (col.length > 0) col[col.length - 1].faceUp = true;
      return next;
    }

    if (p.type === 'waste-to-tableau') {
      const card = next.waste.pop();
      const col = next.tableau[p.tableauIdx];
      if (!card || !col) return state;
      col.push(card);
      return next;
    }

    if (p.type === 'tableau-to-tableau') {
      const from = next.tableau[p.fromIdx];
      const to = next.tableau[p.toIdx];
      if (!from || !to || p.fromIdx === p.toIdx || p.cardIdx < 0 || p.cardIdx >= from.length) return state;
      const moving = from.slice(p.cardIdx);
      from.length = p.cardIdx;
      to.push(...moving);
      if (from.length > 0) from[from.length - 1].faceUp = true;
      return next;
    }

    return next;
  },

  isOver(state) {
    if (isWon(state)) {
      return {
        winner: state.playerId,
        reason: 'All foundations complete',
        pointsEarned: { [state.playerId ?? 'solo']: 500 },
      };
    }
    return null;
  },

  bot: solitaireBot,
};

export { SolitaireBoard } from './Solitaire';
export type { SolitaireState, SolitaireMove };