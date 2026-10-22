# Hye Arcade — UI, Match History, Chat, and Monopoly Update

## Implemented

### Glass UI and game selection
- Standardized game selection cards to a neutral glass treatment instead of per-game card colours/glows.
- Added a short description to each of the 22 registered games; the selected game's lobby shows the fuller description.
- Refreshed the lobby player seats into glass pills.
- Replaced the wide **Add Bot** control with a compact robot-SVG button at the lower-left of the lobby.
- Kept **How to play** as a visible action in the lobby and restyled its guide sheet with glass surfaces.

### Lobby and in-game chat
- Added a grouped glass chat control to the lobby and the in-game screen.
- Added unread-count badges and a temporary latest-message preview that opens chat when tapped.
- Reused the existing chat panel and LAN transport message type; offline/local games keep a local chat transcript for the current lobby or match.

### In-game tools and player profiles
- Added a grouped floating glass pill with Chat, Match History, and Menu actions.
- The existing top-left Back control remains in each game screen. Restart is available from the global menu rather than the old top-right reset control.
- Added a structured move timeline using the accepted `session.history` events for all registered games.
- Player pills open a local profile summary when a human profile is available. Bot pills do not open a profile.
- Saved match records now preserve up to 2,000 move events, the original setup snapshot, and the player roster. Profile → Match history opens the saved event timeline for completed matches. Older records without these fields remain supported.

### Monopoly real-estate menu and purchase offers
- The in-game menu now has **Real estate**, **Finances**, and **Match** tabs.
- Real estate lists purchasable properties, ownership, price, base/current rent, colour group, buildings, and mortgage status, including unowned properties.
- Finances shows current cash, estimated owned-property/building value, deficit if any, mortgage count, and player balances.
- When a player lands on another player's purchasable property, the turn enters a short offer window after rent is handled. The visitor can send up to five sequential cash offers, including a quick **All cash** offer. The owner can accept or reject an offer out of turn; a rejection lets the visitor try again, and accepting transfers the property and cash.
- Offers respect the current cash balance, prevent transfers of properties whose colour group has buildings, and account for mortgage interest when applicable. Regular property trades remain separate from the landing-only purchase offer.

## Verification
- `npm test`: **22 tests passed**.
- TypeScript transpile/syntax check: **21 changed TS/TSX files passed**.
- Added tests for the five-offer limit, off-turn acceptance, cash/ownership transfer, saved match-history backup round-tripping, and descriptions for all 22 games.

## Not verified in this environment
- A full Vite/TypeScript production build and APK build were **not** completed. This source package has no installed `node_modules`; an offline dependency install stopped because a package tarball was not cached. The UI has not been smoke-tested on a real Android device or across two LAN-connected devices.
- The history now stores the original setup and ordered actions to support replay, but a visual board-by-board replay controller is not part of this update yet.
- This source package did not contain a generated `android/` project, so the ZIP contains the full source project and tests, not a built APK or native Android folder.
