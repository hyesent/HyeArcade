export const easing = {
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  quick: 'cubic-bezier(0.4, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  linear: 'linear',
};

export const duration = {
  instant: 100,
  fast: 180,
  normal: 240,
  slow: 360,
  epic: 600,
};

export const transition = {
  fast: `all ${duration.fast}ms ${easing.quick}`,
  normal: `all ${duration.normal}ms ${easing.smooth}`,
  slow: `all ${duration.slow}ms ${easing.smooth}`,
  pop: `transform ${duration.normal}ms ${easing.pop}`,
};

export const keyframes = {
  fadeIn: `
    @keyframes hye-fade-in {
      from { opacity: 0 }
      to { opacity: 1 }
    }
  `,
  riseIn: `
    @keyframes hye-rise-in {
      from { opacity: 0; transform: translateY(12px) }
      to { opacity: 1; transform: translateY(0) }
    }
  `,
  pop: `
    @keyframes hye-pop {
      0% { transform: scale(0.9); opacity: 0 }
      60% { transform: scale(1.03); opacity: 1 }
      100% { transform: scale(1) }
    }
  `,
  glow: `
    @keyframes hye-glow {
      0%, 100% { opacity: 0.6 }
      50% { opacity: 1 }
    }
  `,
};

export const styleSheet = Object.values(keyframes).join('\n');