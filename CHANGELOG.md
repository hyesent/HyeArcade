# Changelog

## 2026-10-17 — Board/UI, native LAN source, branding, and final wrap-up

- Increased the usable board stage on mobile and expanded responsive sizing for Ludo, Checkers/Drafts, Snake & Ladder, Chess, Scrabble, Gomoku, and Go.
- Recalibrated the Ludo overlay to the supplied image's actual non-square grid area. Corrected track/yard coordinate math and separated finished pawns at the center.
- Reworked Checkers/Drafts board framing, contrast, square treatment, and piece presentation; added true Go intersections and star points in the Traditional Go / Classic Pirate screen.
- Moved Monopoly turn actions into a centered modal opened from the top menu's Actions tab; kept estate, finances, offers, trades, and history reachable without shrinking the board permanently.
- Added captured readable move summaries to match history and fallback descriptions for Ludo dice/pawn moves, Snake & Ladder rolls, Checkers/Drafts, Chess, card games, and board coordinates. Hidden-game guest history strips raw move payloads while retaining safe summaries.
- Added Classic Pirate / Traditional Go as lobby-selected modes and synchronized the host-selected mode in LAN room start.
- Added a monochrome controller app icon and black Hye Arcade splash assets for Android density/orientation resources, plus a short in-app controller/title fade for Android 12+; configured dark system bars.
- Added the native Android `LanHostPlugin` source: embedded HTTP/SSE rooms, UDP local discovery, room membership, per-player private views, host-only move-request delivery, event replay, chat/reactions, bot-seat registration, reconnect grace, and host reassignment for public-state games. Registered the plugin in `MainActivity` and added Wi-Fi/multicast manifest permissions.
- Fixed an event-stream issue in the Node relay: raw guest move requests are delivered only to the host without incrementing the public sequence. This avoids leaking pending private actions to other guests and prevents sequence-gap resync loops.
- Updated the Android GitHub Actions workflow to preserve the checked-in custom Android project instead of always attempting to regenerate it.
- Expanded automated coverage to **36 passing tests**. Ran **792 randomized game runs / 45,823 accepted moves** across 22 games with zero detected stalls, setup errors, private-view assertion failures, or missing private-state views.
- **Not verified:** full Vite/TypeScript build, Android Gradle build, and real-device LAN. Dependency installation and the Gradle distribution download failed because the environment could not reach the network. The native plugin is in the ZIP, but phone-to-phone behavior still requires a build and physical-device test.

This changelog consolidates the supplied Hye Arcade source update series. It is not a claim that every feature listed below has passed device-level QA.

## 2026-10-16 — Final source audit and LAN/social update

- Consolidated the UI/history/Monopoly update and LAN event-protocol work into the current source archive.
- Added lobby and in-game chat panels, preset messages, quick emoji reactions, unread badges and temporary message previews.
- Added Friendly, Rival, Strategist, and Quiet bot personality settings and short contextual bot comments.
- Added ordered LAN event metadata, sequence numbers, bounded replay history, retry request IDs, duplicate-request handling, coordinator-authorized accepted-move events, sender checks, chat payload limits/rate limiting, reconnect grace, and resync requests.
- Fixed Snake & Ladder to apply the die value accepted by the coordinator instead of rolling again during state application.
- Corrected the Node LAN relay's Whot room limit from four to six players to match the registered game's six-player maximum; added a room-capacity integration test.
- Added per-player hidden-state projections for Crazy Eights, UNO, Whot, Monopoly Deal, Scrabble, Mahjong, Scramble, Treasure Hunt, and Monopoly. This also hides draw-pile order in card games. The relay rejects private-game snapshots unless all room members have a view, preserves the host history, and keeps replay/resync snapshots private instead of falling back to full state.
- Added explicit `move.rejected` delivery so a guest receives feedback when the coordinator rejects an invalid move; contained rejected sends to avoid unhandled transport promises.
- Hardened snapshot membership/size/history validation, capped move payload size, preserved profile IDs, added SSE keepalives, fixed replay gaps after replacing bulky snapshots, and synchronized player connection state in private views.
- Fixed Monopoly Deal turn-state bugs: it now distinguishes the initial draw from the end of a three-play turn, offers legal discard actions for hands above seven, routes pending responses to the correct player, and prevents bots from drawing twice.
- Fixed a Checkers end-state bug that could leave a player with no legal moves without ending the match.
- Fixed Mahjong Solitaire's Turtle layout from 148 slots to the canonical 144, eliminating a setup failure that prevented valid deals from being generated.
- Added room-code entry for native LAN joins, made Android build scripts tolerate an existing `android/` directory, and polished shared game glass panels, focus states, and mobile spacing.
- Added randomized game simulation tooling and targeted tests for Mahjong Solitaire, Monopoly Deal, LAN privacy, concurrency, and session membership. The current source passes 31 automated tests and 792 randomized game simulations (36,495 accepted moves) across three batches with no detected stalls/setup errors/view failures.
- Updated README and audit notes to state actual Android readiness and remaining release blockers rather than implying the native APK transport is complete.

## Earlier supplied update series included

- Layer 1 profile progression, XP, achievements/titles, match statistics, and backup export/import.
- Match history and replay/event-log persistence improvements.
- Game card descriptions and fuller game-guide summaries.
- Monopoly estate/finance/action views, property purchase offers, and trade-related logic updates.
- Screen/mobile quality, rules, Vita Mahjong, Monopoly, Ayo Ọlọ́pọ́n, and Pirate Go fixes documented in the companion `*-UPDATE.md`, `*-PASS.md`, `RULE-*`, and `LAYER-1-*` files included in the archive.

## Known incomplete work

- Native Capacitor `LanHost` Android implementation and automatic local-device discovery are missing from this archive.
- Hidden-information views now exist for the identified private-state games; real-device verification remains outstanding.
- Host/coordinator failover is not a conflict-free election protocol.
- A full TypeScript build, generated APK, two-device LAN session, and end-to-end gameplay pass for every game have not been verified.

## 22 October 2026 — expansion games, guide content, and documentation

- Registered ten expansion titles: Dominoes, Othello/Reversi, Backgammon, Battleship, 2048, Minesweeper, Sudoku, Memory Match, Hearts, and Hangman.
- Added a shared touch-first expansion screen, game catalogue descriptions, and in-app How to Play guides for the new titles. Added difficulty/board selectors for Sudoku, Minesweeper, Memory Match, and Hangman.
- Wired LAN support in the registry for Dominoes, Othello/Reversi, Backgammon, Battleship, Memory Match, and Hearts. Hidden-state projections are defined for Dominoes, Battleship, Hearts, and Memory Match; real-device verification remains required.
- Documented game-specific rule scope and limitations in `docs/GAME_CATALOGUE.md` and LAN setup/trust boundaries in `docs/LAN_MULTIPLAYER.md`.
- Updated README and Android build documentation.
- Fixed the Monopoly token animation effect so its interval is not restarted on every animation frame and respects reduced-motion preferences.
- Updated profile game titles, achievement progression, and game metrics for all 32 registered games so the completionist milestone no longer assumes a 22-game catalogue.
- Fixed the GitHub Actions APK rename step to rename `app-debug.apk` to `HyeArcade.apk` (the previous step attempted to rename the target file to itself).
- Verification: 11 focused expansion tests passed. A randomized simulation completed 1,152 runs across all 32 registered games (80-move cap), with 66,620 accepted moves, zero stalls/setup errors/private-view assertion failures, and no missing private-state projections. The full automated test suite also passed (53 passed, 0 failed). Full dependency installation/TypeScript-Vite build, APK build, and physical-device LAN testing remain unverified because package downloads were unavailable in this environment.
