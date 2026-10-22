import type { UnoCard as UnoCardType } from './types';
import { tokens } from '../../theme/tokens';

const COLOR_HEX: Record<string, string> = {
  R: '#E23E57',
  G: '#4FD1A0',
  B: '#4FB8D9',
  Y: '#E8B95C',
  W: '#8B7FE8',
};

interface Props {
  card: UnoCardType | null;
  width?: number;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function UnoCardView({ card, width = 64, playable, selected, onClick }: Props) {
  const height = width * 1.45;

  if (!card) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: width * 0.12,
          background: '#1E1B28',
          border: `2px solid ${tokens.bg.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.text.muted,
        }}
      >
        UNO
      </div>
    );
  }

  const bg = COLOR_HEX[card.color] ?? COLOR_HEX.W;
  const isWild = card.color === 'W';

  return (
    <button
      onClick={onClick}
      style={{
        width,
        height,
        padding: 0,
        borderRadius: width * 0.12,
        background: bg,
        border: '2px solid #F5F2EA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected
          ? `0 12px 28px rgba(0,0,0,0.6), 0 0 20px ${tokens.accent.gold}88`
          : playable
            ? `0 4px 12px rgba(0,0,0,0.4), 0 0 10px ${tokens.accent.gold}44`
            : '0 2px 6px rgba(0,0,0,0.5)',
        transform: selected ? 'translateY(-14px)' : 'translateY(0)',
        transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
        cursor: playable ? 'pointer' : 'default',
        color: '#F5F2EA',
        fontFamily: tokens.font.display,
        fontWeight: 700,
        fontSize: width * 0.4,
        textShadow: '0 2px 4px rgba(0,0,0,0.4)',
      }}
    >
      {isWild ? '★' : card.value.slice(0, 3)}
    </button>
  );
}