# Hye Arcade — Final wrap-up audit

**Audit date:** 17 October 2026  
**Source of truth:** the supplied `HyeArcade.zip`, with the changes recorded in `CHANGELOG.md`.

## UI and board changes

- Enlarged the shared game stage and adjusted responsive board sizes for Ludo, Checkers/Drafts, Snake & Ladder, Chess, Scrabble, Gomoku, and Go.
- Measured `src/assets/boards/ludo.png` and found that the image has a large blank strip at the bottom. Its horizontal grid is approximately 1230 px while its vertical grid is approximately 1195 px inside a 1254 px image. The overlay now uses separate x/y spans; pawn yards, the 52-square track, home lanes, and finish positions are calibrated against the supplied asset.
- Restyled Checkers/Drafts board frames, contrast, square edges, piece appearance, and legal-move highlights. Drafts remains 10×10 and Checkers 8×8.
- Replaced the Go board's checker-like square presentation with a proper intersection grid, star points, stones, and larger transparent hit areas.
- Monopoly turn actions are in a centered modal reached from the top menu's Actions tab. The modal dims the background, has a close action, and no longer takes permanent board space.
- Match history now captures readable summaries from game state logs and generates fallback summaries for dice, pawn moves, card plays, captures, board coordinates, and other actions. Private-game guest history keeps sanitized summaries and strips raw payloads.
- Pirate Go's Classic Pirate / Traditional Go choice is in the lobby. The selected board/mode is included in the room start event.
- Added a monochrome controller launcher icon and black Hye Arcade splash images across Android densities/orientations, plus a short in-app controller/title fade so the wordmark appears after the Android 12+ system splash.

## LAN changes

- Added the native Capacitor `LanHostPlugin` source and registered it in `MainActivity`.
- The plugin implements an embedded HTTP/SSE room host and UDP discovery, using TCP ports 8787–8797 and UDP port 47872.
- Added Wi-Fi/multicast permissions and manifest preparation support.
- LAN host start now carries the selected board/mode and configured bot seats.
- Raw guest move requests are delivered only to the coordinator without advancing the public sequence. This avoids pending private actions leaking to all guests and avoids false sequence-gap resync loops. Accepted moves are broadcast as shared events.
- The native plugin sanitizes non-host history payloads and requires player views for the private-information game set.
- The Node relay includes integration tests for host-only move delivery, room mode synchronization, bot seats, private views, identity checks, capacity, and deduplication.

## Automated checks

- `npm test`: **36 passed, 0 failed**.
- Randomized simulations: **792 runs** (36 runs × 22 games), with up to 80 attempted moves per run.
- Accepted moves applied during simulation: **45,823**.
- Detected stalls: **0**.
- Setup errors: **0**.
- Hidden-view assertion failures: **0**.
- Missing private-state views: **0**.
- TypeScript/TSX syntax parser: **170 files, 0 syntax errors**.
- Ludo geometry and Pirate Go lobby-mode tests pass.

These are smoke/stress checks, not proof of every possible rule sequence. Many long-form games did not reach a terminal state within 80 moves; that is expected and was not counted as an error.

## Not verified

- `npm run build` and the full application typecheck: dependency installation could not complete because this environment could not reach the package network.
- Android Gradle build: the wrapper attempted to download Gradle 8.11.1 but DNS/network access to `services.gradle.org` failed.
- Java/Capacitor plugin compilation: blocked by the unavailable Android/Gradle build environment.
- Real-device LAN: not tested. Hotspot discovery, Wi-Fi-to-Wi-Fi connections, reconnects, and all game moves still require two-device testing.
- Visual screenshots: the UI changes were source-reviewed but could not be rendered in a running Vite/Android build here.

## Release decision

The source contains the requested UI/board changes, native LAN plugin implementation, protocol fixes, icon/splash assets, changelog, and tests. **Do not call Android LAN complete until the APK builds and the two-device test plan in `ANDROID-LANHOST-IMPLEMENTATION.md` passes.** The local relay is plaintext and intended only for a trusted nearby network; future Internet mode should use a separate reachable relay.
