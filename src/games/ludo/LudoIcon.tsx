interface Props { size?: number; color?: string; }

export function LudoIcon({ size = 48, color = '#FF9A3C' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke={color} strokeWidth="2" />
      <rect x="8" y="8" width="12" height="12" rx="2" fill={color} opacity="0.85" />
      <rect x="28" y="8" width="12" height="12" rx="2" fill={color} opacity="0.55" />
      <rect x="8" y="28" width="12" height="12" rx="2" fill={color} opacity="0.55" />
      <rect x="28" y="28" width="12" height="12" rx="2" fill={color} opacity="0.85" />
      <circle cx="24" cy="24" r="4" fill={color} />
    </svg>
  );
}