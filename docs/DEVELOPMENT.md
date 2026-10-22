# Development notes

## Requirements

- Node.js 22 or newer
- npm
- Java 21 for the Android build workflow
- Android SDK/Gradle environment when building outside GitHub Actions

## Web development and tests

```bash
npm ci
npm run dev
npm run lint
npm test
npm run test:games
npm run build
```

## Android

The checked-in `android/` directory is intentional. GitHub Actions installs dependencies, builds the web app, syncs Capacitor, applies the Android LAN configuration, builds the debug APK, renames it to `HyeArcade.apk`, and uploads it as an artifact.

For a local build in an environment with Android SDK and Gradle downloads available:

```bash
npm ci
npm run build
npx cap sync android
npm run cap:android:prepare
cd android
./gradlew assembleDebug
```

Do not infer that an APK has built successfully just because the workflow YAML exists. Confirm the GitHub Actions run and test the resulting APK on a device.

## Sound effects

Sound playback is centralised in `src/theme/sounds.ts`; source WAV assets live under `src/assets/sounds/`. The sound manager stores the enable/disable setting and master volume in local storage. Calls to sound playback are best-effort and must not interrupt gameplay when audio is unavailable.

## Guides and catalogue entries

When adding a game, update all of the following together:

1. `src/games/registry.ts`
2. The screen mapping in `src/screens/Game.tsx`
3. `src/games/descriptions.ts`
4. `src/games/game-guides.ts`
5. `docs/GAME_CATALOGUE.md`
6. Relevant tests and the changelog

Guide text must describe the rules implemented by the engine, not a generic version that differs from the game.
