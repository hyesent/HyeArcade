import { useState, useRef, useEffect } from 'react';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';

export interface ChatMessage {
  id: string;
  player: string;
  text: string;
  ts: number;
}

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
  onReact?: (emoji: string) => void;
}

export function ChatPanel({ open, messages, onClose, onSend, onReact }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      play('chat-message', 0.3);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [open, messages.length]);

  if (!open) return null;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
    play('button-tap', 0.3);
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <span style={styles.title}>Chat</span>
        <button style={styles.close} onClick={onClose}>
          ×
        </button>
      </header>

      <div ref={scrollRef} style={styles.list}>
        {messages.length === 0 && (
          <p style={styles.empty}>No messages yet.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} style={styles.msg}>
            <span style={styles.msgPlayer}>{m.player}</span>
            <span style={styles.msgText}>{m.text}</span>
          </div>
        ))}
      </div>

      <div style={styles.quickRow} aria-label="Preset messages">{['Good game!','Well played.','Your turn!','Nice move!','One moment…'].map(text => <button type="button" key={text} style={styles.quickChip} onClick={() => { onSend(text); play('button-tap',0.25); }}>{text}</button>)}</div>
      <div style={styles.reactionRow} aria-label="Quick reactions">{['👏','👍','😂','😮','😅','🎉','🤔','❤️'].map(emoji => <button type="button" key={emoji} style={styles.reaction} aria-label={`Send ${emoji}`} onClick={() => onReact ? onReact(emoji) : onSend(emoji)}>{emoji}</button>)}</div>
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Say something…"
          maxLength={200}
        />
        <button style={styles.send} onClick={submit}>
          →
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(30,27,40,.94)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255,255,255,.14)',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    zIndex: 90,
    animation: 'hye-rise-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadow: tokens.shadow.lg,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.space.md}px ${tokens.space.lg}px`,
    borderBottom: `1px solid ${tokens.bg.divider}`,
  },
  title: {
    fontWeight: 600,
    fontSize: tokens.size.md,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.pill,
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.1)',
    color: tokens.text.secondary,
    fontSize: tokens.size.lg,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.space.md,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.sm,
  },
  empty: {
    color: tokens.text.muted,
    fontSize: tokens.size.sm,
    textAlign: 'center',
    padding: tokens.space.lg,
  },
  msg: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  msgPlayer: {
    fontSize: 10,
    color: tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  msgText: {
    fontSize: tokens.size.sm,
    color: tokens.text.primary,
  },
  quickRow: {display:'flex',gap:6,padding:'10px 12px 0',overflowX:'auto'},
  quickChip: {flexShrink:0,padding:'7px 10px',borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.055)',color:tokens.text.secondary,fontSize:11,whiteSpace:'nowrap'},
  reactionRow: {display:'flex',justifyContent:'space-between',gap:3,padding:'8px 12px 0'},
  reaction: {width:34,height:32,borderRadius:11,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',fontSize:17},
  inputRow: {
    display: 'flex',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderTop: `1px solid ${tokens.bg.divider}`,
  },
  input: {
    flex: 1,
    padding: tokens.space.md,
    background: 'rgba(255,255,255,.045)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: tokens.radius.md,
    color: tokens.text.primary,
    fontSize: tokens.size.sm,
    outline: 'none',
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    background: tokens.accent.gold,
    color: tokens.text.inverse,
    fontSize: tokens.size.lg,
    fontWeight: 700,
  },
};