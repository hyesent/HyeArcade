import type { PlayingCard } from './types';
import { getCard } from './deck';
import { CardView } from './CardView';

interface Props {
  cardIds: string[];
  playableIds?: Set<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  maxWidth?: number;
}

export function Hand({ cardIds, playableIds, selectedId, onSelect, maxWidth = 340 }: Props) {
  const cardWidth = Math.max(44, Math.min(64, (maxWidth - 24) / Math.min(Math.max(cardIds.length, 1), 5)));

  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', padding: '18px 4px 8px', boxSizing: 'border-box' }}>
    <div
      style={{
        display: 'flex',
        width: 'max-content',
        minWidth: '100%',
        justifyContent: cardIds.length <= 5 ? 'center' : 'flex-start',
        alignItems: 'flex-end',
        gap: 4,
        minHeight: cardWidth * 1.6,
      }}
    >
      {cardIds.map((id) => {
        const card: PlayingCard | null = id === '__hidden__' ? null : getCard(id);
        const playable = playableIds?.has(id) ?? false;
        return (
          <CardView
            key={id}
            card={card}
            width={cardWidth}
            playable={playable}
            selected={selectedId === id}
            onClick={() => onSelect?.(id)}
          />
        );
      })}
    </div>
    </div>
  );
}