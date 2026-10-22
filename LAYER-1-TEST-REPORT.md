# Hye Arcade Layer 1 — verification report

## Delivered scope

This change set adds the on-device player progression layer for the Capacitor Android app: local profiles, per-profile game statistics, match history, XP, 95 achievements, 30 titles, title selection, a profile screen, post-match rewards, JSON profile backup/restore, and Android manifest preparation for the next LAN layer. It covers all 22 registered game IDs.

This archive is source code prepared for the APK build pipeline; it is **not a compiled APK binary**. The repository workflow builds the web bundle, generates/syncs the Capacitor Android platform, configures its manifest, runs Gradle `assembleDebug`, and uploads the APK.

## Tests executed

Command: `npm test`

Result: **17 passed, 0 failed**.

- 3 Android manifest preparation tests: permissions/cleartext setup, idempotent execution, overriding a prior false cleartext value, and a clear failure when the generated Android project is absent.
- 14 Layer 1 progression tests: all 22 game IDs represented uniquely, profile defaults and name bounds, result/XP/stat recording, idempotent result recording, win/loss/draw and solo outcome classification, special-feat conditions, completion coverage for all 22 games, backup/import validation and compatibility normalization, game-specific metric extraction (including Monopoly, Ludo, Scramble and Ayo), game title/mastery thresholds, persisted result recording, UNO draw accounting, and Drafts/Checkers crown event telemetry.

Command: project-wide TS/TSX syntax parse (`node /tmp/parse_tsx.cjs` in the build environment)

Result: **168 TypeScript/TSX files parsed; 0 syntax diagnostics**.

Command: isolated strict TypeScript check of `src/profile/profileStore.ts` using the standalone project config prepared for this validation run.

Result: **passed**.

## Build limitation — important

Command: `npm run build`

Result: **blocked before Vite build**. TypeScript reports missing type definitions such as `@types/react`, `@types/react-dom`, `@types/node` and other `node_modules/@types` packages. The supplied/inherited `node_modules` tree is incomplete. Reinstalling dependencies with `npm ci` was attempted but the environment could not resolve `registry.npmjs.org` (`EAI_AGAIN` DNS/network failure).

Consequently, a complete production build and Gradle APK build could not be verified in this environment. No binary APK is included. Once the ZIP is placed in the GitHub repository, install dependencies in a network-enabled runner and run the existing **Build Hye Arcade APK** GitHub Actions workflow; it should upload `hye-arcade-debug-apk` if the full build succeeds.

## What these tests do not establish

The tests exercise the local profile/statistics domain logic and the Android manifest-preparation script; they are not a full emulator/device end-to-end test of all 22 games or all profile-screen interactions. Some per-game metrics are derived from end-of-match game state and recorded move payloads, so those should receive additional gameplay-specific validation when running the Android build.

Layer 1 is device-local by design. Profile synchronization, LAN-visible identity, friend/social features, room communication, and native Android LAN hosting are not claimed as implemented here; those belong to the next layer.
