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
  const cardWidth = Math.min(64, (maxWidth - cardIds.length * 4) / cardIds.length);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 4,
        paddingTop: 20,
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
  );
}