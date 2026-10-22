import { Howl, Howler } from 'howler';

// Small generated WAVs are bundled with src, so effects work in Vite and Capacitor
// without relying on files being copied into /public manually.
export type SoundName =
  | 'dice-roll' | 'dice-land' | 'card-flip' | 'card-deal'
  | 'tile-place' | 'tile-pick' | 'piece-move' | 'piece-capture'
  | 'chip-clink' | 'turn-start' | 'turn-wait' | 'win' | 'lose'
  | 'coin-insert' | 'coin-clink' | 'point-earn' | 'high-score'
  | 'button-tap' | 'chat-message' | 'error' | 'timer-tick'
  | 'combo' | 'big-combo' | 'ladder-climb' | 'snake-slide' | 'victory' | 'defeat';

const sources: Record<SoundName, string> = {
  'dice-roll': new URL('../assets/sounds/dice-roll.wav', import.meta.url).href,
  'dice-land': new URL('../assets/sounds/dice-land.wav', import.meta.url).href,
  'card-flip': new URL('../assets/sounds/card-flip.wav', import.meta.url).href,
  'card-deal': new URL('../assets/sounds/card-deal.wav', import.meta.url).href,
  'tile-place': new URL('../assets/sounds/tile-place.wav', import.meta.url).href,
  'tile-pick': new URL('../assets/sounds/tile-pick.wav', import.meta.url).href,
  'piece-move': new URL('../assets/sounds/piece-move.wav', import.meta.url).href,
  'piece-capture': new URL('../assets/sounds/piece-capture.wav', import.meta.url).href,
  'chip-clink': new URL('../assets/sounds/chip-clink.wav', import.meta.url).href,
  'turn-start': new URL('../assets/sounds/turn-start.wav', import.meta.url).href,
  'turn-wait': new URL('../assets/sounds/turn-wait.wav', import.meta.url).href,
  win: new URL('../assets/sounds/win.wav', import.meta.url).href,
  lose: new URL('../assets/sounds/lose.wav', import.meta.url).href,
  'coin-insert': new URL('../assets/sounds/coin-insert.wav', import.meta.url).href,
  'coin-clink': new URL('../assets/sounds/coin-clink.wav', import.meta.url).href,
  'point-earn': new URL('../assets/sounds/point-earn.wav', import.meta.url).href,
  'high-score': new URL('../assets/sounds/high-score.wav', import.meta.url).href,
  'button-tap': new URL('../assets/sounds/button-tap.wav', import.meta.url).href,
  'chat-message': new URL('../assets/sounds/chat-message.wav', import.meta.url).href,
  error: new URL('../assets/sounds/error.wav', import.meta.url).href,
  'timer-tick': new URL('../assets/sounds/timer-tick.wav', import.meta.url).href,
  combo: new URL('../assets/sounds/combo.wav', import.meta.url).href,
  'big-combo': new URL('../assets/sounds/big-combo.wav', import.meta.url).href,
  'ladder-climb': new URL('../assets/sounds/ladder-climb.wav', import.meta.url).href,
  'snake-slide': new URL('../assets/sounds/snake-slide.wav', import.meta.url).href,
  victory: new URL('../assets/sounds/victory.wav', import.meta.url).href,
  defeat: new URL('../assets/sounds/defeat.wav', import.meta.url).href,
};

const cache = new Map<SoundName, Howl>();
const STORAGE_KEY = 'hyearcade-sound-enabled';
let enabled = true;
let masterVolume = 0.75;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'false') enabled = false;
  const savedVolume = Number(localStorage.getItem('hyearcade-sound-volume'));
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) masterVolume = savedVolume;
} catch { /* localStorage may be unavailable in private/webview contexts */ }
Howler.mute(!enabled);
Howler.volume(masterVolume);

function getSound(name: SoundName): Howl {
  let sound = cache.get(name);
  if (!sound) {
    sound = new Howl({ src: [sources[name]], format: ['wav'], preload: true, volume: 0.6 });
    cache.set(name, sound);
  }
  return sound;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  Howler.mute(!on);
  try { localStorage.setItem(STORAGE_KEY, String(on)); } catch { /* ignore */ }
}

export function isSoundEnabled(): boolean { return enabled; }

export function getSoundVolume(): number { return masterVolume; }

export function setSoundVolume(value: number): void {
  masterVolume = Math.max(0, Math.min(1, value));
  Howler.volume(masterVolume);
  try { localStorage.setItem('hyearcade-sound-volume', String(masterVolume)); } catch { /* ignore */ }
}

export function play(name: SoundName, volume = 0.6): void {
  if (!enabled) return;
  try {
    const sound = getSound(name);
    sound.volume(Math.max(0, Math.min(1, volume)));
    sound.play();
  } catch {
    // Sound effects must never interrupt gameplay if audio is unavailable.
  }
}

export function preload(names: SoundName[]): void {
  if (!enabled) return;
  names.forEach((name) => { try { getSound(name).load(); } catch { /* ignore */ } });
}
