import type { MovePath, PathStep } from './types';

const DEFAULT_STEP_MS = 160;

export interface AnimateOptions {
  stepDuration?: number;
  onStep?: (step: PathStep, index: number) => void;
  onComplete?: () => void;
}

export function animatePath(
  element: HTMLElement,
  path: MovePath,
  options: AnimateOptions = {},
): Promise<void> {
  const duration = options.stepDuration ?? DEFAULT_STEP_MS;

  return new Promise((resolve) => {
    let i = 0;

    const playStep = () => {
      if (i >= path.steps.length) {
        options.onComplete?.();
        resolve();
        return;
      }

      const step = path.steps[i];
      const next = path.steps[i + 1] ?? step;

      const dx = next.x - step.x;
      const dy = next.y - step.y;
      const hopLift = path.style === 'hop' ? -8 : 0;

      element.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      element.style.transform = `translate(${dx}px, ${dy + hopLift}px)`;

      options.onStep?.(step, i);

      i++;
      setTimeout(() => {
        element.style.transform = `translate(${next.x - step.x}px, ${next.y - step.y}px)`;
        playStep();
      }, duration);
    };

    playStep();
  });
}

export const EASING = {
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  quick: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
};

export const DURATION = {
  instant: 100,
  fast: 180,
  normal: 240,
  slow: 360,
  epic: 600,
};