import type { PlayingCard, Suit, Rank, CardId } from './types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Standard 52-card deck
export function buildStandardDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

// Look up a card by its id (from a static master list — safe because ids are unique)
const ALL_CARDS: Record<string, PlayingCard> = (() => {
  const map: Record<string, PlayingCard> = {};
  for (const c of buildStandardDeck()) map[c.id] = c;
  return map;
})();

export function getCard(id: CardId): PlayingCard {
  return ALL_CARDS[id];
}

export function isRed(card: PlayingCard): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number(rank);
}

// Deterministic shuffle with seed (for LAN replay)
export function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  const out = [...arr];
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}