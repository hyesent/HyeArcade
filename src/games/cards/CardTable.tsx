import type { ReactNode } from 'react';
import { tokens } from '../../theme/tokens';

interface Props {
  top: ReactNode;
  middle: ReactNode;
  bottom: ReactNode;
}

export function CardTable({ top, middle, bottom }: Props) {
  return (
    <div style={styles.root}>
      <div style={styles.top}>{top}</div>
      <div style={styles.middle}>{middle}</div>
      <div style={styles.bottom}>{bottom}</div>
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
    minHeight: 0,
  },
  top: { display: 'flex', justifyContent: 'flex-start', gap: tokens.space.md, flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', padding: '2px 4px 6px', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' },
  middle: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xl,
    minHeight: 0,
  },
  bottom: { display: 'flex', justifyContent: 'center', width: '100%', minWidth: 0, paddingBottom: tokens.space.md, boxSizing: 'border-box' },
};