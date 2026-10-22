# Hye Arcade

Hye Arcade is a mobile-first board, card, word, and puzzle collection built with React, TypeScript, Vite, and Capacitor. The app includes a shared game-session engine, player profiles and progression, in-app How to Play guides, sound effects, and a local-network multiplayer path.

## Game catalogue

The source currently registers **32 games**:

### Board and strategy
- Tic-Tac-Toe
- Connect Four
- Gomoku
- Chess
- Checkers
- Drafts (international draughts)
- Ludo
- Snake & Ladder
- Monopoly
- Monopoly Deal
- Pirate Go (Classic Pirate and Traditional Go)
- Ayo Ọlọ́pọ́n
- Dominoes
- Othello / Reversi
- Backgammon (including doubling cube and gammon/backgammon scoring)
- Battleship

### Cards and tiles
- UNO
- Whot
- Crazy Eights
- Hearts
- Solitaire
- Mahjong
- Mahjong Solitaire
- Vita Mahjong

### Word and puzzle
- Scrabble
- Scramble
- Hangman
- Treasure Hunt
- 2048
- Minesweeper
- Sudoku
- Memory Match

See [`docs/GAME_CATALOGUE.md`](docs/GAME_CATALOGUE.md) for the expansion game's current rule scope and known limitations. The catalogue count reflects registered game definitions, not a claim that every game variant has undergone exhaustive or tournament-level validation.

## Existing gameplay and UI work

- Shared responsive game stage and touch-oriented controls.
- Dedicated game screens for several complex boards, including Monopoly, Chess, Go, Scrabble, Mahjong, Ludo, Whot, and Snake & Ladder.
- Monopoly property, ownership, estate, finance, trade, auction, and action flows are handled by the existing engine and screen. New visual work must preserve these mechanics.
- Snake & Ladder movement uses a separate forward walk and snake/ladder transition, guards against rolling during movement, and records the exact die result for replay.
- Shared sound manager with bundled WAV effects, saved enable/disable preference, and master volume.
- Game-specific guide content in `src/games/game-guides.ts`.
- Local chat/reactions and LAN room/session support in the existing networking layer.

## Development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
npm run lint
npm test
npm run test:games
npm run build
```

Run a repeatable randomized simulation batch (Bash/Linux/macOS):

```bash
HYE_SIM_RUNS=36 HYE_SIM_MAX_MOVES=80 npm run test:games
```

## Android APK

The checked-in `android/` project is intentional. The GitHub Actions workflow installs dependencies, builds the web app, syncs Capacitor, applies Android LAN configuration, builds a debug APK, renames it to `HyeArcade.apk`, and uploads it as an artifact.

For a local build in an environment with Android SDK and Gradle downloads available:

```bash
npm ci
npm run build
npx cap sync android
npm run cap:android:prepare
cd android
./gradlew assembleDebug
```

Do not run Gradle locally in Termux unless your environment is deliberately configured for Android builds. The repository's CI workflow is the intended APK build path for this project.

## LAN multiplayer

The app includes a Node development relay and a native Android `LanHostPlugin` for local discovery and room hosting. Multiplayer expansion games use the existing session protocol. LAN support must be validated on at least two physical Android devices on both Wi-Fi and a phone hotspot before it is considered verified.

For the Node relay on a trusted local network:

```bash
npm run lan-server -- --host 0.0.0.0 --port 8787
npm run dev -- --host 0.0.0.0
```

Connect devices to the host computer's LAN address and port `8787` in the LAN dialog. This tests the Node relay, not the native Android plugin.

**Security note:** the embedded local relay uses plaintext HTTP/SSE and is intended for trusted nearby networks only. Do not expose it to the public Internet. Public online play requires a separate secured relay and stronger authentication.

## Documentation

- [`README-ANDROID.md`](README-ANDROID.md) — Android and APK build notes.
- [`docs/GAME_CATALOGUE.md`](docs/GAME_CATALOGUE.md) — registered games, multiplayer scope, and current limitations.
- [`docs/LAN_MULTIPLAYER.md`](docs/LAN_MULTIPLAYER.md) — LAN setup, testing, and trust boundary.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — development, tests, audio, and integration checklist.
- `CHANGELOG.md` — project history and this update.
- `ANDROID-LANHOST-IMPLEMENTATION.md` and `LAN-EVENT-PROTOCOL-IMPLEMENTATION.md` — native LAN plugin and event protocol details.
- `RULE_AUDIT.md` and `RULE-FIXES-VERIFICATION.md` — existing rules audit and verification notes.

## Verification status

- Full automated test suite: **53 passed, 0 failed** (`npm test`), including 11 focused expansion tests.
- Randomized game simulation: **1,152 runs** across all 32 registered games, capped at 80 moves per run; **66,620 accepted moves**, zero stalls, zero setup errors, zero private-view assertion failures, and no missing private-state projections. Runs that hit the move cap are not proof of a win or exhaustive rule correctness.
- `npm ci --dry-run --offline`: lockfile consistency check passed.
- Full dependency installation and TypeScript/Vite build, Android APK build, and physical-device LAN sessions: **not verified in this environment** because package downloads were unavailable. Run the commands above in a network-enabled environment and resolve any reported issues before publishing an APK.

Known rule-scope limitations are documented in `docs/GAME_CATALOGUE.md`; source integration should not be confused with physical-device validation.
