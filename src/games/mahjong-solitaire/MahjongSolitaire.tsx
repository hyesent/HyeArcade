import { useState } from 'react';
import type { Move } from '../../core/types';
import type { MahjongSolitaireState, Tile } from './types';
import { isFree, canMatch } from './logic';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: MahjongSolitaireState;
  onMove: (move: Move<{ a: string; b: string }>) => void;
  disabled?: boolean;
}

const TILE_W = 44;
const TILE_H = 56;
const OFFSET = 6; // grid spacing
const LAYER_OFFSET = 5;

export function MahjongSolitaireBoard({ state, onMove, disabled }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const selected = selectedId
    ? state.tiles.find((t) => t.id === selectedId) ?? null
    : null;

  const handleClick = (tile: Tile) => {
    if (disabled) return;
    if (tile.removed || !isFree(tile, state.tiles)) {
      setFeedback('That tile is covered or blocked. Choose a free tile with at least one open side.');
      play('error', 0.25);
      return;
    }

    setFeedback('');
    if (!selected) {
      setSelectedId(tile.id);
      play('button-tap', 0.2);
      return;
    }

    if (selected.id === tile.id) {
      setSelectedId(null);
      return;
    }

    if (canMatch(selected, tile)) {
      setFeedback('');
      play('tile-place', 0.4);
      onMove({
        type: 'match',
        player: state.playerId,
        payload: { a: selected.id, b: tile.id },
        ts: Date.now(),
      });
      setSelectedId(null);
    } else {
      setFeedback('Those tiles do not match. Choose the same tile face, then look for another free pair.');
      play('error', 0.25);
      setSelectedId(tile.id);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.title}>MAHJONG SOLITAIRE • MATCH FREE TILES</div>
      {feedback && <div role="status" aria-live="polite" style={styles.feedback}>{feedback}</div>}
      <div style={styles.header}>
        <span style={styles.stat}>Matches: {state.matches}</span>
        <span style={styles.stat}>
          Remaining: {state.tiles.filter((t) => !t.removed).length}
        </span>
      </div>

      <div style={styles.boardWrap}>
        <div style={styles.board}>
          {state.tiles
            .filter((t) => !t.removed)
            .sort((a, b) => a.layer - b.layer)
            .map((tile) => {
              const free = isFree(tile, state.tiles);
              const sel = selectedId === tile.id;
              const left = tile.x * (TILE_W + OFFSET) + tile.layer * LAYER_OFFSET;
              const top = tile.y * (TILE_H + OFFSET) + tile.layer * LAYER_OFFSET;

              return (
                <button
                  key={tile.id}
                  onClick={() => handleClick(tile)}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: TILE_W,
                    height: TILE_H,
                    borderRadius: '5px 5px 3px 3px',
                    border: sel
                      ? `2px solid ${tokens.accent.gold}`
                      : `1px solid ${free ? '#8A7A5A' : '#4A4030'}`,
                    background: free
                      ? 'linear-gradient(180deg, #fff8df 0%, #ead9ad 100%)'
                      : 'linear-gradient(180deg, #e1d0a8 0%, #b09b6d 100%)',
                    boxShadow: sel
                      ? `0 5px 12px rgba(0,0,0,0.55), 0 0 16px ${tokens.accent.gold}88`
                      : '3px 4px 0 rgba(73,55,31,.65), 0 5px 8px rgba(0,0,0,.38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: tokens.font.display,
                    fontWeight: 700,
                    fontSize: 18,
                    color: tile.suit === 'chr'
                      ? '#A03030'
                      : tile.suit === 'dragon' && tile.label === 'R'
                        ? '#A03030'
                        : tile.suit === 'dragon' && tile.label === 'G'
                          ? '#2A7030'
                          : '#1A1720',
                    cursor: free ? 'pointer' : 'not-allowed',
                    zIndex: tile.layer * 10,
                    transition: 'all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: sel ? 'translateY(-3px)' : 'translateY(0)',
                  }}
                >
                  {tile.label}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
    width: '100%',
    height: '100%',
    padding: tokens.space.md,
    overflow: 'hidden',
    background: 'radial-gradient(circle at 50% 40%, #28704d 0%, #12422e 75%)',
    borderRadius: 18,
    border: '10px solid #57371f',
    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.12), 0 18px 40px rgba(0,0,0,.4)',
  },
  title: { color:'#e3d2a9', fontSize:10, letterSpacing:1.5, textAlign:'center', fontWeight:800 },
  feedback: { padding:'8px 12px', borderRadius:10, background:'#3a2a1b', border:'1px solid #b78a4a', color:'#fff0d0', fontSize:12, lineHeight:1.4, textAlign:'center' },
  header: {
    display: 'flex',
    gap: tokens.space.lg,
    justifyContent: 'center',
  },
  stat: {
    fontSize: tokens.size.sm,
    color: tokens.text.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  boardWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    minHeight: 0,
  },
  board: {
    position: 'relative',
    width: 14 * (TILE_W + OFFSET),
    height: 10 * (TILE_H + OFFSET),
  },
};