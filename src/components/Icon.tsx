import type { CSSProperties } from 'react';

export type IconName =
  | 'arrow-left'
  | 'plus'
  | 'x'
  | 'more'
  | 'settings'
  | 'rotate'
  | 'volume-on'
  | 'volume-off'
  | 'chat'
  | 'history'
  | 'check'
  | 'crown'
  | 'chevron-down'
  | 'home'
  | 'save'
  | 'info';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

const PATHS: Record<IconName, string> = {
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  more: 'M12 5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1ZM12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1ZM12 19.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z',
  rotate: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  'volume-on': 'M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  'volume-off': 'M11 5 6 9H2v6h4l5 4V5ZM22 9l-6 6M16 9l6 6',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  history: 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2',
  check: 'M20 6 9 17l-5-5',
  crown: 'M3 7l4 5 5-8 5 8 4-5v10H3Z',
  'chevron-down': 'm6 9 6 6 6-6',
  home: 'M3 12 12 3l9 9M5 10v10h14V10',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8',
  info: 'M12 11v5M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
};

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  style,
  strokeWidth = 2,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}