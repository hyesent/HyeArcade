import { useEffect, useState, type CSSProperties } from 'react';

export function LaunchSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 680);
    const done = window.setTimeout(onDone, 980);
    return () => { window.clearTimeout(fade); window.clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-label="Hye Arcade starting"
      style={{ ...styles.root, opacity: leaving ? 0 : 1, pointerEvents: leaving ? 'none' : 'auto' }}
    >
      <style>{`
        @keyframes hye-console-enter { from { opacity:0; transform:translateY(14px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes hye-title-enter { from { opacity:0; transform:translateY(8px); letter-spacing:.34em; } to { opacity:1; transform:translateY(0); letter-spacing:.2em; } }
        @media (prefers-reduced-motion: reduce) { .hye-splash-console, .hye-splash-title { animation:none !important; } }
      `}</style>
      <div style={styles.content}>
        <svg className="hye-splash-console" viewBox="0 0 240 140" role="img" aria-label="Minimal game controller" style={styles.controller}>
          <defs>
            <linearGradient id="hye-console-shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".58" stopColor="#e5e8ec" />
              <stop offset="1" stopColor="#b8c0c9" />
            </linearGradient>
            <radialGradient id="hye-console-shadow" cx=".35" cy=".22" r=".9">
              <stop offset="0" stopColor="#50565e" />
              <stop offset="1" stopColor="#101318" />
            </radialGradient>
          </defs>
          <ellipse cx="120" cy="118" rx="78" ry="9" fill="#252a31" opacity=".48" />
          <path d="M49 39 Q59 27 78 31 L96 37 L144 37 L162 31 Q181 27 191 39 L213 87 Q218 103 205 110 Q192 116 182 101 L169 81 L71 81 L58 101 Q48 116 35 110 Q22 103 27 87 Z" fill="url(#hye-console-shell)" stroke="#929ba5" strokeWidth="2" strokeLinejoin="round" />
          <rect x="103" y="42" width="34" height="17" rx="5" fill="#252a31" />
          <path d="M53 56 V72 M45 64 H61" stroke="#252a31" strokeWidth="7" strokeLinecap="round" />
          <circle cx="178" cy="52" r="5" fill="#252a31" />
          <circle cx="190" cy="64" r="5" fill="#252a31" />
          <circle cx="178" cy="76" r="5" fill="#252a31" />
          <circle cx="166" cy="64" r="5" fill="#252a31" />
          <circle cx="91" cy="80" r="8" fill="url(#hye-console-shadow)" stroke="#a4adb7" strokeWidth="1.5" />
          <circle cx="149" cy="80" r="8" fill="url(#hye-console-shadow)" stroke="#a4adb7" strokeWidth="1.5" />
        </svg>
        <h1 className="hye-splash-title" style={styles.title}>HYE ARCADE</h1>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
    background: '#000000', color: '#f6f7f9', transition: 'opacity 280ms ease',
    padding: '24px', overflow: 'hidden',
  },
  content: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, width: '100%' },
  controller: { width: 'clamp(150px, 39vw, 228px)', height: 'auto', filter: 'drop-shadow(0 18px 22px rgba(0,0,0,.45))', animation: 'hye-console-enter 520ms cubic-bezier(.2,.8,.2,1) both' },
  title: { margin: 0, color: '#f5f6f8', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 850, lineHeight: 1.2, textAlign: 'center', letterSpacing: '.2em', textIndent: '.2em', animation: 'hye-title-enter 480ms 170ms ease both' },
};
