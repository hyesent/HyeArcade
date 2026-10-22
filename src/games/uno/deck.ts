import type { UnoCard, UnoColor, UnoValue } from './types';

const COLORS: UnoColor[] = ['R', 'G', 'B', 'Y'];

export function buildUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let serial = 0;
  const add = (color: UnoColor, value: UnoValue) => {
    deck.push({ id: `${color}-${value}-${serial++}`, color, value });
  };

  for (const color of COLORS) {
    add(color, '0');
    for (let n = 1; n <= 9; n++) {
      const v = String(n) as UnoValue;
      add(color, v);
      add(color, v);
    }
    for (const v of ['SKIP', 'REV', 'DRAW2'] as UnoValue[]) {
      add(color, v);
      add(color, v);
    }
  }

  for (let i = 0; i < 4; i++) {
    add('W', 'WILD');
    add('W', 'WILD4');
  }

  return deck;
}

const CARD_MAP: Record<string, UnoCard> = (() => {
  const map: Record<string, UnoCard> = {};
  for (const c of buildUnoDeck()) map[c.id] = c;
  return map;
})();

export function getUnoCard(id: string): UnoCard {
  return CARD_MAP[id];
}

export function canPlayUno(
  card: UnoCard,
  top: UnoCard,
  activeColor: UnoColor,
  pendingDraw: number,
  hand: UnoCard[] = [],
): boolean {
  // Classic UNO: a draw penalty is resolved by drawing; it is not stacked.
  if (pendingDraw > 0) return false;
  if (card.value === 'WILD4') {
    return !hand.some((c) => c.color === activeColor);
  }
  if (card.value === 'WILD') return true;
  if (card.color === activeColor) return true;
  return card.value === top.value;
}
