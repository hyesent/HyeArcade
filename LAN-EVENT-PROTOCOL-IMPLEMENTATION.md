# Hye Arcade — LAN Event Protocol Update

## Implemented in source

- Versioned transport metadata (`version`, `sequence`, `eventId`, `senderId`, and retry-stable `requestId`).
- Server-assigned monotonically increasing room event sequence numbers, bounded event history, SSE IDs, reconnect replay, snapshots for sequence gaps, and 15-second SSE keepalives.
- Client-side ordered sending, retries, duplicate-request handling, visible transport errors, and resynchronization requests.
- Coordinator-authorized `move.accepted` events and `move.rejected` feedback for guests when the host refuses an invalid action.
- Sender identity checks for requested moves, host-only accepted/rejected events, chat impersonation checks, bounded chat/reaction payloads, rate limiting, and payload limits for move/session snapshots.
- Canonical room membership and profile IDs are preserved by the relay; host snapshots cannot add, remove, or rename room members.
- A short disconnect grace period before marking a player offline. Public-state games may transfer coordinator responsibility after that delay; private-state games do not promote a redacted guest view to authority, and moves are rejected until the original host reconnects.
- Room discovery returns metadata rather than the full game state.
- Per-player `GameDefinition.view` projections are implemented for Crazy Eights, UNO, Whot, Monopoly Deal, Scrabble, Mahjong, Scramble, Treasure Hunt, and Monopoly. Private-game snapshots are rejected unless all room members have a projection; resync/replay snapshots keep the same privacy boundary.
- Snake & Ladder and Ludo dice rolls from guests are replaced by coordinator-generated results before the move is applied.
- Lobby and in-game chat include preset messages and quick emoji reactions. Bots have Friendly, Rival, Strategist, and Quiet personality options.

## Validation

- `npm test` equivalent direct run: **36 tests passed, 0 failed**.
- Randomized simulations: one randomized batch of 36 runs per game (22 games), totalling **792 simulated runs and 45,823 accepted game moves**, with zero setup errors, zero detected stalls, and zero privacy-view assertion failures.
- TypeScript/TSX syntax transpilation: 171 files, zero syntax diagnostics.
- `tsc -p tsconfig.logic.json`: passed.
- Full application typecheck/production build: not verified because dependency installation could not complete from the network.

## Remaining release blockers

The current archive includes `android/` and a native `LanHostPlugin` implementation registered in `MainActivity`, with embedded HTTP/SSE room hosting and UDP discovery. It has not been compiled or tested on physical Android devices in this environment. No APK was built, and hotspot-to-Wi-Fi / Wi-Fi-to-Wi-Fi play has not been tested. The plugin is implemented in source but still requires build/device verification.

The relay is a local trusted-network prototype, not a public Internet service: rooms and event logs are in-memory, and host failover is delayed reassignment rather than a conflict-free election. For future online play, the protocol can be reused behind an authenticated, persistent service, but authentication, abuse controls, durable room state, and reconnect/failover semantics still need production design.
