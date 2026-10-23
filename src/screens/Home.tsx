import { useMemo, useState } from 'react';
import { GAMES } from '../games/registry';
import { tokens } from '../theme/tokens';
import { play } from '../theme/sounds';
import { Icon } from '../components/Icon';
import { getActiveProfile, getActiveTitle } from '../profile/profileStore';
import { GAME_DESCRIPTIONS } from '../games/descriptions';

interface HomeProps {
  onSelectGame: (id: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenOnlineLobby: () => void;
  onOpenMultiplayer: () => void;
}

export function Home({ onSelectGame, onOpenProfile, onOpenSettings, onOpenOnlineLobby, onOpenMultiplayer }: HomeProps) {
  const [filter, setFilter] = useState<string>('all');
  const profile = getActiveProfile();
  const activeTitle = getActiveTitle(profile);

  const tags = useMemo(() => {
    const s = new Set<string>();
    GAMES.forEach((g) => g.tags.forEach((t) => s.add(t)));
    return ['all', ...Array.from(s)];
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return GAMES;
    return GAMES.filter((g) => g.tags.includes(filter));
  }, [filter]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const open = (id: string) => {
    play('coin-insert', 0.5);
    onSelectGame(id);
  };

  return (
    <div style={styles.root}>
      <header style={styles.topbar}>
        <div style={styles.brandBlock}>
          <span style={styles.brandMain}>HYE</span>
          <span style={styles.brandSub}>ARCADE</span>
        </div>
        <div style={styles.topActions}>
          <button
            style={styles.iconBtn}
            onClick={() => {
              play('button-tap', 0.3);
              onOpenProfile();
            }}
            aria-label="Player profile and achievements"
          >
            <Icon name="crown" size={18} color={tokens.accent.gold} />
          </button>
          <button
            style={styles.iconBtn}
            onClick={() => {
              play('button-tap', 0.3);
              onOpenSettings();
            }}
            aria-label="Settings"
          >
            <Icon name="settings" size={18} color={tokens.text.secondary} />
          </button>
        </div>
      </header>

      <button type="button" style={styles.profileStrip} onClick={onOpenProfile} aria-label="Open player profile">
        <span style={styles.profileAvatar}>{profile.name.trim().charAt(0).toUpperCase() || 'H'}</span>
        <span style={styles.profileIdentity}><strong>{profile.name}</strong><small>{activeTitle.name}</small></span>
        <span style={styles.profileProgress}>{profile.totalXp.toLocaleString()} XP <span>·</span> {profile.matchesPlayed} matches</span>
        <Icon name="arrow-left" size={15} color={tokens.text.muted} style={{ transform: 'rotate(180deg)' }} />
      </button>

      <div style={styles.multiplayerActions}>
        <button type="button" style={styles.onlineLobbyButton} onClick={() => { play('button-tap', 0.3); onOpenOnlineLobby(); }}>
          <span style={styles.multiplayerGlyph}>◎</span>
          <span style={styles.multiplayerText}><strong>Online Lobby</strong><small>Find rooms and play over the internet</small></span>
          <Icon name="arrow-left" size={16} color={tokens.accent.gold} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button type="button" style={styles.multiplayerButton} onClick={() => { play('button-tap', 0.3); onOpenMultiplayer(); }}>
          <span style={styles.multiplayerGlyph}>⌁</span>
          <span style={styles.multiplayerText}><strong>Multiplayer</strong><small>Choose online or local network</small></span>
          <Icon name="arrow-left" size={16} color={tokens.text.secondary} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.meta}>
          {GAMES.length} {GAMES.length === 1 ? 'game' : 'games'}
        </span>
      </div>

      {tags.length > 2 && (
        <div style={styles.filters}>
          {tags.map((t) => (
            <button
              key={t}
              style={{
                ...styles.filterChip,
                ...(filter === t ? styles.filterChipActive : {}),
              }}
              onClick={() => {
                play('button-tap', 0.3);
                setFilter(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {featured && (
        <button
          style={styles.featured}
          onClick={() => open(featured.id)}
        >
          <div style={styles.featuredBody}>
            <p style={styles.featuredKicker}>Featured</p>
            <h2 style={styles.featuredName}>{featured.name}</h2>
            <p style={styles.featuredMeta}>{GAME_DESCRIPTIONS[featured.id]?.short ?? 'A Hye Arcade game.'}</p>
            <p style={{ ...styles.featuredMeta, fontSize: 11, marginTop: 3 }}>
              {featured.minPlayers === featured.maxPlayers ? `${featured.minPlayers} players` : `${featured.minPlayers}–${featured.maxPlayers} players`}
            </p>
          </div>
          <div style={styles.featuredPlay}>
            <span style={styles.featuredPlayText}>Play</span>
            <Icon name="arrow-left" size={16} color={tokens.text.inverse} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </button>
      )}

      {rest.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>All games</p>
          <div style={styles.grid}>
            {rest.map((game) => (
              <button
                key={game.id}
                style={styles.tile}
                onClick={() => open(game.id)}
              >
                <span style={styles.tileName}>{game.name}</span>
                <span style={styles.tileDescription}>{GAME_DESCRIPTIONS[game.id]?.short ?? 'Play a classic.'}</span>
                <span style={styles.tileMeta}>
                  {game.minPlayers === game.maxPlayers
                    ? `${game.minPlayers}P`
                    : `${game.minPlayers}–${game.maxPlayers}P`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p style={styles.empty}>No games in this category.</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: `${tokens.space.lg}px ${tokens.space.lg}px ${tokens.space.xl}px`,
    gap: tokens.space.lg,
    animation: 'hye-fade-in 300ms ease-out',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.space.sm,
    fontFamily: tokens.font.display,
    letterSpacing: 4,
    fontWeight: 700,
  },
  brandMain: {
    fontSize: 24,
    color: tokens.accent.gold,
  },
  brandSub: {
    fontSize: 12,
    color: tokens.text.secondary,
    letterSpacing: 6,
  },
  topActions: {
    display: 'flex',
    gap: tokens.space.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
  },
  profileStrip: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 13px', borderRadius: 15, border: `1px solid ${tokens.bg.border}`, background: 'linear-gradient(115deg, rgba(232,185,92,.1), rgba(30,27,40,.95) 55%)', textAlign: 'left', color: tokens.text.primary },
  profileAvatar: { width: 35, height: 35, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 11, background: tokens.accent.gold, color: tokens.text.inverse, fontWeight: 900, fontFamily: tokens.font.display },
  profileIdentity: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  profileProgress: { marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', fontSize: 10, color: tokens.text.secondary, flexShrink: 0 },
  multiplayerActions: { display: 'grid', gridTemplateColumns: '1fr', gap: 9 },
  onlineLobbyButton: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 17, border: '1px solid rgba(232,185,92,.32)', background: 'linear-gradient(110deg,rgba(232,185,92,.12),rgba(255,255,255,.025))', color: tokens.text.primary, textAlign: 'left' },
  multiplayerButton: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 17, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.surface, color: tokens.text.primary, textAlign: 'left' },
  multiplayerGlyph: { display: 'grid', placeItems: 'center', width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: 'rgba(232,185,92,.1)', color: tokens.accent.gold, fontSize: 24 },
  multiplayerText: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -tokens.space.sm,
  },
  meta: {
    fontSize: tokens.size.xs,
    color: tokens.text.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  filters: {
    display: 'flex',
    gap: tokens.space.sm,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    marginTop: -tokens.space.sm,
  },
  filterChip: {
    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
    borderRadius: tokens.radius.pill,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    color: tokens.text.secondary,
    fontSize: tokens.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  },
  filterChipActive: {
    background: tokens.accent.gold,
    color: tokens.text.inverse,
    borderColor: tokens.accent.gold,
  },
  featured: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.lg,
    padding: tokens.space.xl,
    background: 'linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025))',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,.13)',
    borderRadius: tokens.radius.xl,
    textAlign: 'left',
    overflow: 'hidden',
    transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  featuredBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  featuredKicker: {
    margin: 0,
    fontSize: 10,
    color: tokens.text.muted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  featuredName: {
    margin: 0,
    fontFamily: tokens.font.display,
    fontSize: tokens.size.xxl,
    fontWeight: 700,
    color: tokens.text.primary,
  },
  featuredMeta: {
    margin: 0,
    fontSize: tokens.size.sm,
    color: tokens.text.secondary,
  },
  featuredPlay: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
    background: tokens.accent.gold,
    borderRadius: tokens.radius.pill,
  },
  featuredPlayText: {
    fontSize: tokens.size.sm,
    fontWeight: 700,
    color: tokens.text.inverse,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
  },
  sectionLabel: {
    margin: 0,
    fontSize: 10,
    color: tokens.text.muted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: tokens.space.md,
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    minHeight: 126,
    padding: tokens.space.lg,
    background: 'linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025))',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: tokens.radius.lg,
    transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    textAlign: 'left',
  },
  tileName: {
    fontFamily: tokens.font.display,
    fontWeight: 600,
    fontSize: tokens.size.md,
    color: tokens.text.primary,
    lineHeight: 1.2,
  },
  tileDescription: { fontSize: 11, color: tokens.text.secondary, lineHeight: 1.4, flex: 1 },
  tileMeta: {
    fontSize: tokens.size.xs,
    color: tokens.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  empty: {
    textAlign: 'center',
    color: tokens.text.muted,
    padding: tokens.space.xxl,
    fontSize: tokens.size.sm,
  },
};