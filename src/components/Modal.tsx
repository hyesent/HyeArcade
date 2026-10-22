import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (open) play('turn-start', 0.35);
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <h2 style={styles.title}>{title}</h2>}
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: tokens.bg.overlay,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.lg,
    zIndex: 100,
    animation: 'hye-fade-in 180ms ease-out',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: tokens.bg.raised,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.xl,
    boxShadow: tokens.shadow.lg,
    animation: 'hye-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  title: {
    margin: `0 0 ${tokens.space.lg}px`,
    fontFamily: tokens.font.display,
    fontSize: tokens.size.xl,
    fontWeight: 700,
    textAlign: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
  },
};