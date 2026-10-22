import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import {
  ACHIEVEMENT_CATALOG,
  GAME_CATALOG,
  GAME_METRICS,
  TITLE_CATALOG,
  addProfile,
  exportProfileBackup,
  getActiveTitle,
  getActiveProfile,
  importProfileBackup,
  loadLibrary,
  renameProfile,
  selectProfile,
  setActiveTitle,
  type PlayerProfile,
} from '../profile/profileStore';
import { Icon } from '../components/Icon';
import { tokens } from '../theme/tokens';

interface ProfileProps { onBack: () => void; }
type Tab = 'overview' | 'games' | 'achievements' | 'titles';

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Not yet';
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (mins < 60) return `${mins}m ${seconds}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function percentage(numerator: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : '—';
}

export function Profile({ onBack }: ProfileProps) {
  const [library, setLibrary] = useState(() => loadLibrary());
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedMatch, setSelectedMatch] = useState<PlayerProfile['matchHistory'][number] | null>(null);
  const [draftName, setDraftName] = useState(() => getActiveProfile().name);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const backupInput = useRef<HTMLInputElement>(null);
  const activeProfile = library.profiles.find((profile) => profile.id === library.activeProfileId) ?? library.profiles[0] ?? getActiveProfile();
  const activeTitle = getActiveTitle(activeProfile);
  const unlockedAchievementIds = new Set(activeProfile.unlockedAchievements.map((item) => item.id));
  const sortedGameStats = useMemo(() => [...GAME_CATALOG].sort((a, b) => {
    const left = activeProfile.gameStats[a.id]?.matchesPlayed ?? 0;
    const right = activeProfile.gameStats[b.id]?.matchesPlayed ?? 0;
    return right - left || a.name.localeCompare(b.name);
  }), [activeProfile]);
  const unlockedAchievements = activeProfile.unlockedAchievements.length;

  const refresh = (nextLibrary = loadLibrary()) => {
    setLibrary(nextLibrary);
    const active = nextLibrary.profiles.find((profile) => profile.id === nextLibrary.activeProfileId) ?? nextLibrary.profiles[0];
    setDraftName(active?.name ?? 'Hye Player');
    setMessage(null);
  };
  const showError = (error: unknown) => setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'That action could not be completed.' });

  const saveName = () => {
    try { refresh(renameProfile(activeProfile.id, draftName)); setMessage({ kind: 'success', text: 'Profile name saved on this device.' }); }
    catch (error) { showError(error); }
  };
  const makeProfile = () => {
    try { refresh(addProfile(newName)); setNewName(''); setMessage({ kind: 'success', text: 'New local profile created.' }); }
    catch (error) { showError(error); }
  };
  const changeProfile = (profileId: string) => {
    refresh(selectProfile(profileId));
    setTab('overview');
  };
  const chooseTitle = (titleId: string) => {
    try { refresh(setActiveTitle(activeProfile.id, titleId)); setMessage({ kind: 'success', text: 'Profile title equipped.' }); }
    catch (error) { showError(error); }
  };

  const exportBackup = async () => {
    const text = exportProfileBackup(activeProfile);
    const filename = `hye-arcade-${activeProfile.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'profile'}-backup.json`;
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: filename,
          data: text,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        setMessage({ kind: 'success', text: `Backup saved to Documents. File URI: ${result.uri}` });
        return;
      }
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage({ kind: 'success', text: 'Profile backup downloaded.' });
    } catch (error) {
      showError(error);
    }
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const raw = await file.text();
      const next = importProfileBackup(raw);
      refresh(next);
      setTab('overview');
      setMessage({ kind: 'success', text: 'Profile backup restored successfully.' });
    } catch (error) { showError(error); }
  };

  const achievements = ACHIEVEMENT_CATALOG.filter((achievement) => {
    const unlocked = unlockedAchievementIds.has(achievement.id);
    return achievementFilter === 'all' || (achievementFilter === 'unlocked' ? unlocked : !unlocked);
  });

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <button type="button" style={styles.iconButton} onClick={onBack} aria-label="Back to arcade"><Icon name="arrow-left" size={18} color={tokens.text.primary} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.eyebrow}>HYE ARCADE / PLAYER CARD</p>
          <h1 style={styles.pageTitle}>Profile & progress</h1>
        </div>
        <button type="button" style={styles.backupButton} onClick={() => void exportBackup()}>Export backup</button>
      </header>

      <section style={styles.heroCard}>
        <div style={styles.avatar}>{activeProfile.name.trim().charAt(0).toUpperCase() || 'H'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.heroName}>{activeProfile.name}</div>
          <div style={styles.heroTitle}>{activeTitle.name}</div>
          <div style={styles.heroMeta}>Local profile · created {formatDate(activeProfile.createdAt)}</div>
        </div>
        <div style={styles.xpBadge}><strong>{activeProfile.totalXp.toLocaleString()}</strong><span>XP</span></div>
      </section>

      <div style={styles.tabs} role="tablist" aria-label="Profile sections">
        {([['overview', 'Overview'], ['games', 'Game stats'], ['achievements', `Achievements ${unlockedAchievements}`], ['titles', `Titles ${activeProfile.unlockedTitleIds.length}`]] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} style={{ ...styles.tab, ...(tab === id ? styles.tabActive : {}) }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {message && <div role="status" style={{ ...styles.message, ...(message.kind === 'error' ? styles.errorMessage : styles.successMessage) }}>{message.text}</div>}

      {tab === 'overview' && <>
        <div style={styles.statGrid}>
          <StatCard label="Matches" value={activeProfile.matchesPlayed} helper={`${Object.values(activeProfile.gameStats).filter((stat) => stat.matchesPlayed > 0).length} games tried`} />
          <StatCard label="Wins" value={activeProfile.wins} helper={`${percentage(activeProfile.wins, activeProfile.matchesPlayed)} success rate`} />
          <StatCard label="Losses" value={activeProfile.losses + activeProfile.soloFailures} helper={`${activeProfile.draws} draws`} />
          <StatCard label="Best streak" value={activeProfile.bestWinStreak} helper={`Current: ${activeProfile.currentWinStreak}`} />
        </div>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><p style={styles.eyebrow}>IDENTITY</p><h2 style={styles.sectionTitle}>Local player profile</h2></div><span style={styles.localBadge}>DEVICE ONLY</span></div>
          <div style={styles.formRow}>
            <label style={styles.fieldLabel} htmlFor="profile-name">Display name</label>
            <input id="profile-name" maxLength={24} value={draftName} onChange={(event) => setDraftName(event.target.value)} style={styles.input} />
            <button type="button" style={styles.primaryButton} onClick={saveName}>Save</button>
          </div>
          <p style={styles.note}>Your name, match history and unlocks stay on this device. No account or internet connection is required.</p>
          <div style={styles.formRow}>
            <label style={styles.fieldLabel} htmlFor="profile-switch">Switch profile</label>
            <select id="profile-switch" value={activeProfile.id} onChange={(event) => changeProfile(event.target.value)} style={styles.select}>
              {library.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.fieldLabel} htmlFor="new-profile">New profile</label>
            <input id="new-profile" value={newName} maxLength={24} onChange={(event) => setNewName(event.target.value)} placeholder="Player name" style={styles.input} />
            <button type="button" style={styles.secondaryButton} onClick={makeProfile}>Create</button>
          </div>
          <div style={styles.dataActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => backupInput.current?.click()}>Import backup</button>
            <input ref={backupInput} type="file" accept="application/json,.json" onChange={(event) => void importBackup(event)} style={{ display: 'none' }} aria-label="Choose a Hye Arcade profile backup" />
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><p style={styles.eyebrow}>LATEST RESULTS</p><h2 style={styles.sectionTitle}>Match history</h2></div><button type="button" style={styles.textButton} onClick={() => setTab('games')}>All stats</button></div>
          {activeProfile.matchHistory.length === 0 ? <EmptyState title="Your arcade record starts here" body="Complete any game and your result, score, move count and XP will appear here." /> : (
            <div style={styles.historyList}>
              {activeProfile.matchHistory.slice(0, 8).map((match) => <button type="button" key={match.id} style={{...styles.historyRow, width:'100%',textAlign:'left',background:'transparent',color:tokens.text.primary,cursor:'pointer'}} onClick={()=>setSelectedMatch(match)} aria-label={`Open ${match.gameName} match history`}>
                <div style={styles.historyMark}>{match.outcome === 'win' || match.outcome === 'solo-success' ? 'W' : match.outcome === 'draw' ? '=' : 'L'}</div>
                <div style={{ flex: 1, minWidth: 0 }}><strong style={styles.historyGame}>{match.gameName}</strong><span style={styles.historySub}>{formatDate(match.endedAt)} · {match.moves} moves · {formatDuration(match.durationMs)}</span></div>
                <div style={styles.historyRight}><strong>{match.score.toLocaleString()}</strong><span>+{match.xpEarned} XP</span></div>
              </button>)}
            </div>
          )}
        </section>
      </>}

      {tab === 'games' && <section style={styles.panel}>
        <div style={styles.sectionHeader}><div><p style={styles.eyebrow}>ALL REGISTERED GAMES</p><h2 style={styles.sectionTitle}>Your arcade record</h2></div><span style={styles.localBadge}>{GAME_CATALOG.length} GAMES</span></div>
        <div style={styles.gameStatsList}>
          {sortedGameStats.map((game) => {
            const stat = activeProfile.gameStats[game.id];
            const played = stat?.matchesPlayed ?? 0;
            const metricSummary = (GAME_METRICS[game.id] ?? [])
              .map((metric) => {
                const value = stat?.metrics[metric.key];
                return typeof value === 'number' ? `${metric.label}: ${metric.key === 'longestWord' ? value : value.toLocaleString()}` : '';
              })
              .filter(Boolean)
              .join(' · ');
            return <div key={game.id} style={styles.gameStatsRow}>
              <div style={styles.gameDot}>{game.name.slice(0, 1)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={styles.gameName}>{game.name}</strong>
                <span style={styles.gameStatsSub}>{played ? `${stat!.wins} wins · ${stat!.losses} losses · ${stat!.draws} draws` : 'Not played yet'}</span>
                {metricSummary && <span style={styles.gameMetricsText}>{metricSummary}</span>}
              </div>
              <div style={styles.gameStatsNumbers}><strong>{played}</strong><span>{percentage(stat?.wins ?? 0, played)} win rate</span><small>Best score {stat?.bestScore ?? 0}</small></div>
            </div>;
          })}
        </div>
      </section>}

      {tab === 'achievements' && <section style={styles.panel}>
        <div style={styles.sectionHeader}><div><p style={styles.eyebrow}>MILESTONES</p><h2 style={styles.sectionTitle}>Achievements</h2></div><span style={styles.localBadge}>{unlockedAchievements}/{ACHIEVEMENT_CATALOG.length}</span></div>
        <div style={styles.filterRow}>{([['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Locked']] as Array<[typeof achievementFilter, string]>).map(([id, label]) => <button key={id} type="button" style={{ ...styles.filterButton, ...(achievementFilter === id ? styles.filterButtonActive : {}) }} onClick={() => setAchievementFilter(id)}>{label}</button>)}</div>
        <div style={styles.achievementGrid}>
          {achievements.map((achievement) => {
            const unlocked = unlockedAchievementIds.has(achievement.id);
            return <article key={achievement.id} style={{ ...styles.achievementCard, ...(unlocked ? styles.achievementUnlocked : styles.achievementLocked) }}>
              <div style={{ ...styles.achievementStamp, ...(unlocked ? styles.stampUnlocked : {}) }}>{unlocked ? <Icon name="check" size={20} color={tokens.accent.jade} /> : <span>—</span>}</div>
              <div style={styles.achievementCategory}>{achievement.category}</div>
              <h3 style={styles.achievementTitle}>{achievement.title}</h3>
              <p style={styles.achievementDescription}>{achievement.description}</p>
              <div style={styles.achievementFooter}><span>+{achievement.xpReward} XP</span><span>{unlocked ? formatDate(activeProfile.unlockedAchievements.find((item) => item.id === achievement.id)?.unlockedAt) : 'Locked'}</span></div>
            </article>;
          })}
        </div>
      </section>}

      {tab === 'titles' && <section style={styles.panel}>
        <div style={styles.sectionHeader}><div><p style={styles.eyebrow}>PLAYER IDENTITY</p><h2 style={styles.sectionTitle}>Titles</h2></div><span style={styles.localBadge}>{activeProfile.unlockedTitleIds.length}/{TITLE_CATALOG.length}</span></div>
        <p style={styles.note}>Earn titles by playing widely, building win streaks and mastering individual games. Your active title is shown on this profile.</p>
        <div style={styles.titleList}>
          {TITLE_CATALOG.map((title) => {
            const unlocked = activeProfile.unlockedTitleIds.includes(title.id);
            const active = activeProfile.activeTitleId === title.id;
            return <div key={title.id} style={{ ...styles.titleRow, ...(active ? styles.titleRowActive : {}) }}>
              <div style={styles.titleEmblem}><Icon name="crown" size={19} color={unlocked ? tokens.accent.gold : tokens.text.muted} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><strong style={styles.titleName}>{title.name}</strong><span style={styles.titleDescription}>{title.description}</span></div>
              {unlocked ? <button type="button" style={active ? styles.equippedButton : styles.secondaryButton} disabled={active} onClick={() => chooseTitle(title.id)}>{active ? 'Equipped' : 'Equip'}</button> : <span style={styles.lockedLabel}>Locked</span>}
            </div>;
          })}
        </div>
      </section>}

      <footer style={styles.footer}>Layer 1 · Offline profile progression · Version {activeProfile.schemaVersion}</footer>
      {selectedMatch && <div role="presentation" style={styles.matchOverlay} onClick={()=>setSelectedMatch(null)}><section role="dialog" aria-modal="true" aria-label={`${selectedMatch.gameName} match history`} style={styles.matchPanel} onClick={e=>e.stopPropagation()}><header style={styles.matchHeader}><div><p style={styles.eyebrow}>SAVED MATCH</p><h2 style={{margin:'4px 0',fontSize:20}}>{selectedMatch.gameName}</h2><span style={styles.historySub}>{formatDate(selectedMatch.endedAt)} · {selectedMatch.moves} recorded actions · {formatDuration(selectedMatch.durationMs)}</span></div><button type="button" style={styles.secondaryButton} onClick={()=>setSelectedMatch(null)}>Close</button></header><div style={styles.matchEvents}>{selectedMatch.moveHistory?.length ? selectedMatch.moveHistory.map((move,index)=>{const actor=move.player===selectedMatch.playerId?selectedMatch.playerName:(selectedMatch.playerRoster?.find(p=>p.id===move.player)?.name??move.player??'Player');const payload=move.payload&&typeof move.payload==='object'?move.payload as Record<string,unknown>:{};const action=String(payload.action??move.type??'Action').replaceAll('_',' ');const detail=Object.entries(payload).filter(([key,value])=>key!=='action'&&value!==undefined&&value!==null&&(typeof value!=='object'||Array.isArray(value))).map(([key,value])=>`${key}: ${Array.isArray(value)?value.map(String).join(', '):String(value)}`).join(' · ');return <article key={`${move.ts??index}-${index}`} style={styles.matchEvent}><span style={styles.historyNumber}>{index+1}</span><div><strong>{actor}</strong><p style={{margin:'4px 0',fontSize:12}}>{action}{detail?` · ${detail}`:''}</p><small style={{color:tokens.text.muted}}>{move.ts?new Date(move.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Recorded action'}</small></div></article>}) : <p style={styles.note}>This older match has a summary but no saved action-by-action timeline.</p>}</div><footer style={styles.matchFooter}>{selectedMatch.initialState!==undefined?'Initial setup snapshot saved for replay support.':'No setup snapshot was saved for this older match.'} Chat messages are not part of gameplay history.</footer></section></div>}
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return <div style={styles.statCard}><span style={styles.statLabel}>{label}</span><strong style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</strong><span style={styles.statHelper}>{helper}</span></div>;
}
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div style={styles.empty}><strong>{title}</strong><span>{body}</span></div>;
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100%', boxSizing: 'border-box', padding: 'max(16px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16, background: tokens.bg.base, color: tokens.text.primary, fontFamily: tokens.font.body },
  header: { display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1000, width: '100%', margin: '0 auto' },
  iconButton: { width: 42, height: 42, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 14, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.surface },
  eyebrow: { margin: 0, fontSize: 9, letterSpacing: 2.2, fontWeight: 800, color: tokens.accent.gold, textTransform: 'uppercase' },
  pageTitle: { margin: '4px 0 0', fontSize: 'clamp(20px, 4vw, 28px)', fontFamily: tokens.font.display, letterSpacing: -0.5 },
  backupButton: { minHeight: 40, border: `1px solid ${tokens.bg.border}`, borderRadius: 12, padding: '8px 11px', background: tokens.bg.surface, color: tokens.text.primary, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' },
  heroCard: { width: '100%', maxWidth: 1000, boxSizing: 'border-box', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, background: 'linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025))', backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)', border: '1px solid rgba(255,255,255,.13)', boxShadow: '0 16px 44px rgba(0,0,0,.22)' },
  avatar: { width: 58, height: 58, borderRadius: 19, display: 'grid', placeItems: 'center', flexShrink: 0, background: 'linear-gradient(145deg, #E8B95C, #805D2D)', color: '#17131C', fontSize: 26, fontWeight: 900, fontFamily: tokens.font.display },
  heroName: { fontWeight: 800, fontFamily: tokens.font.display, fontSize: 21, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  heroTitle: { fontSize: 12, color: tokens.accent.gold, marginTop: 4, fontWeight: 700 },
  heroMeta: { fontSize: 10, color: tokens.text.muted, marginTop: 5 },
  xpBadge: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0, paddingLeft: 8 },
  tabs: { display: 'flex', gap: 6, width: '100%', maxWidth: 1000, alignSelf: 'center', overflowX: 'auto', paddingBottom: 2 },
  tab: { border: `1px solid ${tokens.bg.border}`, borderRadius: 11, background: tokens.bg.surface, color: tokens.text.secondary, padding: '10px 12px', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(232,185,92,.13)', borderColor: `${tokens.accent.gold}88`, color: tokens.accent.gold },
  message: { width: '100%', maxWidth: 1000, alignSelf: 'center', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' },
  successMessage: { background: 'rgba(79,209,160,.10)', border: '1px solid rgba(79,209,160,.35)', color: '#B9F5DB' },
  errorMessage: { background: 'rgba(255,92,122,.10)', border: '1px solid rgba(255,92,122,.35)', color: '#FFD1D9' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 9, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  statCard: { display: 'flex', flexDirection: 'column', gap: 5, padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,.12)', background: 'linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.02))', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)', minWidth: 0 },
  statLabel: { fontSize: 10, fontWeight: 700, color: tokens.text.muted, textTransform: 'uppercase', letterSpacing: 1.2 },
  statValue: { fontSize: 27, lineHeight: 1.05, fontFamily: tokens.font.display },
  statHelper: { fontSize: 10, color: tokens.text.secondary },
  panel: { width: '100%', maxWidth: 1000, alignSelf: 'center', boxSizing: 'border-box', padding: 16, borderRadius: 18, border: '1px solid rgba(255,255,255,.12)', background: 'linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.02))', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 17, margin: '4px 0 0', fontFamily: tokens.font.display },
  localBadge: { flexShrink: 0, border: `1px solid ${tokens.bg.border}`, borderRadius: 8, padding: '5px 8px', fontSize: 9, letterSpacing: 1.1, fontWeight: 800, color: tokens.text.secondary },
  formRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  fieldLabel: { width: '100%', fontSize: 11, color: tokens.text.secondary, fontWeight: 700 },
  input: { minWidth: 0, flex: 1, boxSizing: 'border-box', minHeight: 42, borderRadius: 10, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.base, color: tokens.text.primary, padding: '10px 12px', fontSize: 13, outlineColor: tokens.accent.gold },
  select: { flex: 1, minWidth: 0, minHeight: 42, borderRadius: 10, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.base, color: tokens.text.primary, padding: '8px 10px', fontSize: 12 },
  primaryButton: { minHeight: 42, border: 0, borderRadius: 10, padding: '10px 14px', background: tokens.accent.gold, color: tokens.text.inverse, fontSize: 11, fontWeight: 900 },
  secondaryButton: { minHeight: 38, border: `1px solid ${tokens.bg.border}`, borderRadius: 10, padding: '8px 11px', background: tokens.bg.raised, color: tokens.text.primary, fontWeight: 700, fontSize: 11, flexShrink: 0 },
  note: { margin: '9px 0 0', fontSize: 11, lineHeight: 1.6, color: tokens.text.muted },
  dataActions: { display: 'flex', gap: 8, marginTop: 14 },
  textButton: { border: 0, background: 'transparent', color: tokens.accent.gold, fontSize: 11, fontWeight: 800 },
  historyList: { display: 'flex', flexDirection: 'column', gap: 2 },
  matchOverlay:{position:'fixed',inset:0,zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:12,background:'rgba(5,5,10,.75)',backdropFilter:'blur(7px)'},
  matchPanel:{width:'min(620px,100%)',maxHeight:'min(86dvh,860px)',display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:22,border:'1px solid rgba(255,255,255,.16)',background:'rgba(30,27,40,.97)',backdropFilter:'blur(26px)',color:tokens.text.primary,boxShadow:'0 28px 90px #0008'},
  matchHeader:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,padding:16,borderBottom:'1px solid rgba(255,255,255,.1)'},
  matchEvents:{padding:12,overflowY:'auto',display:'flex',flexDirection:'column',gap:7},
  matchEvent:{display:'flex',gap:10,padding:10,borderRadius:12,background:'rgba(255,255,255,.045)',border:'1px solid rgba(255,255,255,.075)'},
  matchFooter:{padding:'12px 16px',fontSize:10,lineHeight:1.5,color:tokens.text.muted,borderTop:'1px solid rgba(255,255,255,.1)'},
  historyRow: { display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: `1px solid ${tokens.bg.divider}` },
  historyMark: { width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 11, background: tokens.bg.raised, color: tokens.accent.gold, fontWeight: 900, fontSize: 12 },
  historyGame: { display: 'block', fontSize: 12 },
  historySub: { display: 'block', marginTop: 4, fontSize: 10, color: tokens.text.muted },
  historyRight: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 11 },
  empty: { display: 'flex', flexDirection: 'column', gap: 6, padding: 18, border: `1px dashed ${tokens.bg.border}`, borderRadius: 13, color: tokens.text.secondary, fontSize: 12, lineHeight: 1.6 },
  gameStatsList: { display: 'flex', flexDirection: 'column', gap: 4 },
  gameStatsRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: `1px solid ${tokens.bg.divider}` },
  gameDot: { width: 35, height: 35, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 12, background: tokens.bg.raised, color: tokens.accent.gold, fontWeight: 900 },
  gameName: { display: 'block', fontSize: 12 },
  gameStatsSub: { display: 'block', marginTop: 4, fontSize: 10, color: tokens.text.muted },
  gameMetricsText: { display: 'block', marginTop: 5, fontSize: 9, lineHeight: 1.5, color: tokens.accent.jade, overflowWrap: 'anywhere' },
  gameStatsNumbers: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  achievementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 9 },
  achievementCard: { minWidth: 0, borderRadius: 14, padding: 13, border: '1px solid', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  achievementUnlocked: { background: 'rgba(79,209,160,.06)', borderColor: 'rgba(79,209,160,.28)' },
  achievementLocked: { background: tokens.bg.base, borderColor: tokens.bg.divider },
  achievementStamp: { width: 35, height: 35, display: 'grid', placeItems: 'center', borderRadius: 11, background: tokens.bg.raised, color: tokens.text.muted, fontWeight: 900 },
  stampUnlocked: { background: 'rgba(79,209,160,.12)' },
  achievementCategory: { marginTop: 12, fontSize: 8, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', color: tokens.accent.gold },
  achievementTitle: { margin: '5px 0 0', fontSize: 13, fontFamily: tokens.font.display },
  achievementDescription: { margin: '7px 0 13px', fontSize: 10, lineHeight: 1.6, color: tokens.text.secondary, flex: 1 },
  achievementFooter: { width: '100%', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 9, color: tokens.text.muted },
  filterRow: { display: 'flex', gap: 6, marginBottom: 14 },
  filterButton: { padding: '7px 10px', borderRadius: 9, border: `1px solid ${tokens.bg.border}`, background: tokens.bg.base, color: tokens.text.secondary, fontSize: 10, fontWeight: 700 },
  filterButtonActive: { borderColor: tokens.accent.gold, color: tokens.accent.gold, background: 'rgba(232,185,92,.08)' },
  titleList: { display: 'flex', flexDirection: 'column' },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: `1px solid ${tokens.bg.divider}` },
  titleRowActive: { background: 'rgba(232,185,92,.045)' },
  titleEmblem: { width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: tokens.bg.raised, flexShrink: 0 },
  titleName: { display: 'block', fontSize: 12 },
  titleDescription: { display: 'block', marginTop: 4, fontSize: 10, lineHeight: 1.4, color: tokens.text.muted },
  equippedButton: { minHeight: 38, border: '1px solid rgba(232,185,92,.35)', borderRadius: 10, padding: '8px 11px', background: 'rgba(232,185,92,.1)', color: tokens.accent.gold, fontWeight: 800, fontSize: 10 },
  lockedLabel: { flexShrink: 0, fontSize: 9, color: tokens.text.muted, padding: '0 8px' },
  footer: { textAlign: 'center', color: tokens.text.muted, fontSize: 9, letterSpacing: 1, padding: '12px 0 4px' },
};
