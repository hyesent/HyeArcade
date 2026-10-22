import type { PlayingCard } from './types';
import { isRed } from './deck';
import { tokens } from '../../theme/tokens';

interface Props {
  card: PlayingCard | null;      // null renders face-down
  width?: number;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const SUIT_SYMBOL: Record<string, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
};

export function CardView({
  card,
  width = 64,
  selected = false,
  playable = false,
  onClick,
  style,
}: Props) {
  const height = width * 1.45;

  if (!card) return <FaceDown width={width} style={style} />;

  const red = isRed(card);

  return (
    <button
      onClick={onClick}
      style={{
        width,
        height,
        padding: 0,
        border: `1px solid ${tokens.bg.border}`,
        borderRadius: width * 0.1,
        background: '#F5F2EA',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: height * 0.06,
        paddingBottom: height * 0.06,
        paddingLeft: width * 0.08,
        paddingRight: width * 0.08,
        cursor: playable ? 'pointer' : 'default',
        transform: selected ? 'translateY(-14px)' : 'translateY(0)',
        transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: selected
          ? `0 12px 28px rgba(0,0,0,0.6), 0 0 20px ${tokens.accent.gold}88`
          : playable
            ? `0 4px 12px rgba(0,0,0,0.4), 0 0 10px ${tokens.accent.gold}44`
            : `0 2px 6px rgba(0,0,0,0.5)`,
        position: 'relative',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: height * 0.05,
          left: width * 0.08,
          fontSize: width * 0.24,
          fontWeight: 700,
          color: red ? '#C8303C' : '#1A1720',
          lineHeight: 1,
          fontFamily: tokens.font.display,
        }}
      >
        {card.rank}
      </span>
      <span
        style={{
          position: 'absolute',
          top: height * 0.05,
          right: width * 0.08,
          fontSize: width * 0.3,
          color: red ? '#C8303C' : '#1A1720',
          lineHeight: 1,
        }}
      >
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span
        style={{
          fontSize: width * 0.55,
          color: red ? '#C8303C' : '#1A1720',
          textAlign: 'center',
          alignSelf: 'center',
          lineHeight: 1,
        }}
      >
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: height * 0.05,
          right: width * 0.08,
          fontSize: width * 0.24,
          fontWeight: 700,
          color: red ? '#C8303C' : '#1A1720',
          lineHeight: 1,
          fontFamily: tokens.font.display,
          transform: 'rotate(180deg)',
        }}
      >
        {card.rank}
      </span>
    </button>
  );
}

function FaceDown({ width, style }: { width: number; style?: React.CSSProperties }) {
  const height = width * 1.45;
  return (
    <div
      style={{
        width,
        height,
        border: `1px solid ${tokens.bg.border}`,
        borderRadius: width * 0.1,
        background: `repeating-linear-gradient(45deg, #2A2635 0px, #2A2635 6px, #1E1B28 6px, #1E1B28 12px)`,
        boxShadow: `0 2px 6px rgba(0,0,0,0.5)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span style={{ color: tokens.accent.gold, fontSize: width * 0.4 }}>✦</span>
    </div>
  );
}