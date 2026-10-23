import { useState } from 'react';
import { LaunchSplash } from './components/LaunchSplash';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import { Profile } from './screens/Profile';
import { MultiplayerMenu, OnlineLobby } from './screens/Multiplayer';
import { getGame } from './games/registry';
import type { Player } from './core/types';
import type { LanRoomInfo, LanClient } from './core/lan';
import { styleSheet } from './theme/motion';
import { Modal } from './components/Modal';
import { getSoundVolume, isSoundEnabled, setSoundEnabled, setSoundVolume } from './theme/sounds';
import { tokens } from './theme/tokens';

type Screen =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'multiplayer' }
  | { name: 'onlineLobby' }
  | { name: 'lobby'; gameId: string; networkMode?: 'local' | 'lan' | 'online'; initialRoomCode?: string; autoCreateRoom?: boolean }
  | { name: 'game'; gameId: string; players: Player[]; boardId?: string; lanRoom?: LanRoomInfo; lanClient?: LanClient };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume);

  return (
    <>
      <style>{styleSheet}</style>
      {showLaunchSplash && <LaunchSplash onDone={() => setShowLaunchSplash(false)} />}

      {screen.name === 'home' && (
        <Home
          onSelectGame={(gameId) => setScreen({ name: 'lobby', gameId })}
          onOpenProfile={() => setScreen({ name: 'profile' })}
          onOpenSettings={() => setShowSettings(true)}
          onOpenOnlineLobby={() => setScreen({ name: 'onlineLobby' })}
          onOpenMultiplayer={() => setScreen({ name: 'multiplayer' })}
        />
      )}

      {screen.name === 'profile' && <Profile onBack={() => setScreen({ name: 'home' })} />}

      {screen.name === 'multiplayer' && <MultiplayerMenu
        onBack={() => setScreen({ name: 'home' })}
        onOnline={() => setScreen({ name: 'onlineLobby' })}
        onLanGame={(gameId) => setScreen({ name: 'lobby', gameId, networkMode: 'lan' })}
      />}

      {screen.name === 'onlineLobby' && <OnlineLobby
        onBack={() => setScreen({ name: 'home' })}
        onCreateRoom={(gameId) => setScreen({ name: 'lobby', gameId, networkMode: 'online', autoCreateRoom: true })}
        onJoinRoom={(gameId, code) => setScreen({ name: 'lobby', gameId, networkMode: 'online', initialRoomCode: code })}
      />}

      {screen.name === 'lobby' && (() => {
        const game = getGame(screen.gameId);
        if (!game) {
          setScreen({ name: 'home' });
          return null;
        }
        return (
          <Lobby
            game={game}
            onBack={() => setScreen({ name: 'home' })}
            networkMode={screen.networkMode}
            initialRoomCode={screen.initialRoomCode}
            autoCreateRoom={screen.autoCreateRoom}
            onSwitchGame={(gameId) => setScreen(prev => prev.name === 'lobby' ? { ...prev, gameId } : { name: 'lobby', gameId })}
            onStart={(players, boardId, lanRoom, lanClient) =>
              setScreen({ name: 'game', gameId: screen.gameId, players, boardId, lanRoom, lanClient })
            }
          />
        );
      })()}

      {screen.name === 'game' && (() => {
        const game = getGame(screen.gameId);
        if (!game) {
          setScreen({ name: 'home' });
          return null;
        }
        return (
          <Game
            game={game}
            players={screen.players}
            boardId={screen.boardId}
            lanRoom={screen.lanRoom}
            lanClient={screen.lanClient}
            onExit={() => setScreen({ name: 'home' })}
          />
        );
      })()}

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <label style={settingsStyles.toggleRow}>
          <span>Sound effects</span>
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(event) => {
              const next = event.target.checked;
              setSoundOn(next);
              setSoundEnabled(next);
            }}
            aria-label="Enable sound effects"
          />
        </label>
        <label style={settingsStyles.volumeLabel}>
          <span>Sound volume <strong>{Math.round(soundVolume * 100)}%</strong></span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundVolume}
            disabled={!soundOn}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSoundVolumeState(next);
              setSoundVolume(next);
            }}
            aria-label="Sound volume"
          />
        </label>
        <button type="button" style={settingsStyles.done} onClick={() => setShowSettings(false)}>Done</button>
      </Modal>
    </>
  );
}
const settingsStyles: Record<string, React.CSSProperties> = {
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, color: tokens.text.primary, fontSize: 15, fontWeight: 600 },
  volumeLabel: { display: 'flex', flexDirection: 'column', gap: 10, color: tokens.text.secondary, fontSize: 14 },
  done: { border: 0, borderRadius: 14, padding: '12px 16px', color: '#fff', background: tokens.accent.jade, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};
