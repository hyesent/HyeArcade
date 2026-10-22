> Historical report for the 16 October archive. Superseded by `FINAL-AUDIT-2026-10-17.md`, which includes the checked-in Android project, native LanHost source, board/UI changes, and current test results.

# Hye Arcade — Final Source Audit

**Audit date:** 2026-10-16  
**Scope:** latest supplied Hye Arcade source ZIP, LAN protocol, private-state projections, game setup/logic simulation, and shared UI polish.

## Fixes made in this pass

### LAN transport and privacy

- Added per-player views for Crazy Eights, UNO, Whot, Monopoly Deal, Scrabble, Mahjong, Scramble, Treasure Hunt, and Monopoly.
- Private-game session publishing is rejected unless every room member has a view. The server no longer silently falls back to sending the full authoritative state when a private view is absent.
- Reconnect/resync snapshots preserve player-specific views, and replacing old full session snapshots in the replay buffer no longer creates a replay loop on sequence gaps. The host retains the authoritative move history while guests receive a redacted history for private-state games.
- Added SSE keepalives, request-size limits, history limits, profile-ID preservation, canonical room membership checks, and connected-state refreshes for stored player views.
- Added coordinator-issued `move.rejected` messages so remote players get feedback when their action is rejected, and prevented failed fire-and-forget sends from becoming unhandled promise rejections.
- Corrected Whot room capacity to six players.
- Added native lobby room-code input and made the APK scripts tolerate an already-generated `android/` directory.

### Game logic

- Fixed Snake & Ladder's accepted die result being rerolled during state application in the earlier LAN pass.
- Fixed Checkers end-state detection so a player with no legal moves cannot leave the match stuck.
- Fixed Mahjong Solitaire's Turtle layout: the previous slot list contained 148 positions while the tile set contains 144, making deal generation fail. The layout now uses 144 positions and a test builds 30 seeded deals.
- Fixed Monopoly Deal's draw/end-turn state, hand-limit discard availability, pending response turn routing, and bot behavior after the third play.
- Added a stable Scramble hint letter visible to every player and prevented the timeout effect from submitting duplicate skip actions.
- Treasure Hunt's target remains hidden until found or the search limit ends.

### UI and documentation

- Updated shared game panels to use consistent glass surfaces, responsive sizing, visible keyboard focus, and mobile-safe spacing.
- Improved Monopoly Deal's table layout with clearer player summaries, card actions, target selection, property selection, payment selection, and responsive card panels.
- Added a room-code field to the LAN lobby for native joins.
- Added a repeatable `npm run test:games` randomized simulation tool.
- Updated `README.md`, `CHANGELOG.md`, and the LAN protocol notes to match actual implementation status.

## Validation results

- Automated tests: **31 passed, 0 failed**.
- TypeScript/TSX syntax transpilation: **169 files, zero syntax errors**.
- `tsc -p tsconfig.logic.json`: passed.
- Three independent randomized simulation batches: **792 runs across the 22 registered games**, **36,495 accepted game moves**, zero detected stalls, zero setup errors, zero view assertion failures, and no missing private-game projections.
- The Mahjong Solitaire setup test generated 30 seeded deals with 144 unique tile IDs and an available pair in each initial layout.
- LAN integration tests cover room creation/joining, room capacity, sender identity, coordinator-only events, chat impersonation protection, request deduplication, concurrent message sequencing, private-view enforcement, and player-specific SSE snapshots.

## What is not verified

- A full app typecheck/production build could not be completed because the installed dependency/type-definition tree in this environment is incomplete. The logic-only TypeScript project does typecheck.
- No APK was built.
- No physical Android phones were available for hotspot/Wi-Fi LAN tests.
- The archive still lacks the generated `android/` project and native Capacitor `LanHost` implementation. Therefore direct APK-to-APK host server startup and automatic device discovery remain release blockers. The Node relay and frontend protocol improvements do not, by themselves, complete native Android LAN.
- Randomized simulations use legal engine moves and a 60-move cap. They are not exhaustive rule proofs, screenshot/UI automation, or a substitute for playing every game end-to-end.
- Coordinator failover remains delayed reassignment, not a conflict-free election protocol. The relay is an in-memory trusted-network prototype, not a production online backend.

## Release verdict

**The source has materially improved and the automated logic/relay checks pass. It is not ready to be called a finished APK-to-APK LAN release until the native `LanHost` plugin is implemented, built, and tested on real devices.**
