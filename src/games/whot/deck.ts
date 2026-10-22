import type { WhotCard, WhotShape } from './types';

// Standard Whot deck: 5 shapes × numbers 1–14 with some cards missing per shape,
// plus Whot wild. Simplified below — a playable classic set.

const COUNTS: Record<Exclude<WhotShape, 'whot'>, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};

export function buildWhotDeck(): WhotCard[] {
  const deck: WhotCard[] = [];
  for (const [shape, nums] of Object.entries(COUNTS)) {
    for (const n of nums) {
      deck.push({
        id: `${shape}-${n}`,
        shape: shape as WhotShape,
        number: n,
      });
    }
  }
  // 5 Whot wild cards
  for (let i = 0; i < 5; i++) {
    deck.push({ id: `whot-${i}`, shape: 'whot', number: 20 });
  }
  return deck;
}

const CARD_MAP: Record<string, WhotCard> = (() => {
  const map: Record<string, WhotCard> = {};
  for (const c of buildWhotDeck()) map[c.id] = c;
  return map;
})();

export function getWhotCard(id: string): WhotCard {
  return CARD_MAP[id];
}

export function canPlayWhot(
  card: WhotCard,
  top: WhotCard,
  requiredShape: WhotShape | null,
  pendingMarket: number,
): boolean {
  // A pending pick penalty can only be countered by stacking the same penalty.
  // WHOT is not a penalty counter in this app's Nigerian-style rules.
  if (pendingMarket > 0) {
    if (top.number === 2) return card.number === 2;
    if (top.number === 5) return card.number === 5;
    return false;
  }

  if (card.shape === 'whot') return true;

  if (requiredShape) return card.shape === requiredShape;
  if (card.shape === top.shape) return true;
  if (card.number === top.number) return true;
  return false;
}