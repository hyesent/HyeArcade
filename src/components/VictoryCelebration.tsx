import type { CSSProperties } from 'react';

const pieces = Array.from({ length: 34 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${(i % 9) * -0.23}s`,
  duration: `${2.6 + (i % 6) * 0.32}s`,
  rotate: `${(i * 47) % 360}deg`,
  width: `${6 + (i % 4) * 2}px`,
  height: `${9 + (i % 3) * 3}px`,
}));

export function VictoryCelebration() {
  return <div aria-hidden="true" style={styles.layer}>
    <style>{`@keyframes hye-confetti-fall{0%{transform:translate3d(0,-12vh,0) rotate(0deg);opacity:0}8%{opacity:1}100%{transform:translate3d(6vw,112vh,0) rotate(680deg);opacity:0}}@media(prefers-reduced-motion:reduce){.hye-confetti-piece{animation:none!important;opacity:0!important}}`}</style>
    {pieces.map((piece, i) => <span className="hye-confetti-piece" key={i} style={{ ...styles.piece, left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration, transform: `rotate(${piece.rotate})`, width: piece.width, height: piece.height, background: ['#f4c95d','#ff7c91','#69d6b0','#82b9ff','#c69bff'][i % 5] }} />)}
  </div>;
}
const styles: Record<string, CSSProperties> = {
  layer: { position: 'fixed', inset: 0, zIndex: 89, overflow: 'hidden', pointerEvents: 'none' },
  piece: { position: 'absolute', top: '-12vh', borderRadius: 2, animationName: 'hye-confetti-fall', animationTimingFunction: 'linear', animationIterationCount: '1', animationFillMode: 'both' },
};
