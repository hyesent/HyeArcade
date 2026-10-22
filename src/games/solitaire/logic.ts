import type { Card, Suit, Rank, SolitaireState } from './types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function isRed(card: Card): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function deal(playerId = 'solo'): SolitaireState {
  const deck = shuffle(buildDeck());

  const tableau: Card[][] = [[], [], [], [], [], [], []];
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop()!;
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }

  return {
    playerId,
    stock: deck.map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
  };
}

export function canStackTableau(card: Card, onto?: Card): boolean {
  if (!card.faceUp) return false;
  if (!onto) return card.rank === 'K';
  if (!onto.faceUp) return false;
  if (isRed(card) === isRed(onto)) return false;
  return rankValue(card.rank) === rankValue(onto.rank) - 1;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0 || cards.some(c => !c.faceUp)) return false;
  for (let i = 1; i < cards.length; i++) {
    if (!canStackTableau(cards[i], cards[i - 1])) return false;
  }
  return true;
}

export function canStackFoundation(card: Card, onto: Card | undefined): boolean {
  if (!onto) return card.rank === 'A';
  if (card.suit !== onto.suit) return false;
  return rankValue(card.rank) === rankValue(onto.rank) + 1;
}

export function isWon(state: SolitaireState): boolean {
  return state.foundations.every((f) => f.length === 13);
}