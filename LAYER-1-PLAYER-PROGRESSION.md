# Hye Arcade — Layer 1: player progression and local profile system

## Scope and APK boundary

Layer 1 is the on-device player identity and progression foundation for the Capacitor APK. It includes local profiles, match completion records, per-game statistics, XP, achievements, earnable titles, title selection, a profile screen, JSON backup/restore, and post-match rewards. No account, cloud API, or internet access is required. The profile store is local to the installed app/device; this layer does not claim that profiles are synchronized between phones or visible over LAN. That is for the next LAN/social layer.

## Registered game coverage

The source registry contains 22 game IDs and all 22 have game stats, a first-play achievement, a first-win achievement, a ten-win mastery achievement, and a game-specific earnable title.

| Game ID | Display name | Game-specific metrics captured |
| --- | --- | --- |
| `tic-tac-toe` | Tic-Tac-Toe | Player moves taken |
| `connect-four` | Connect Four | Player pieces dropped |
| `gomoku` | Gomoku | Player stones placed |
| `snake-ladder` | Snake & Ladder | Dice rolls from the player's terminal seat state |
| `ludo` | Ludo | Pawns finished, dice rolls |
| `drafts` | Drafts | Captures, crowning/promotion events |
| `checkers` | Checkers | Captures, crowning/promotion events |
| `crazy-eights` | Crazy Eights | Cards played, draw actions |
| `uno` | UNO | Cards played, draw actions |
| `whot` | Whot | Cards played, market draws |
| `solitaire` | Solitaire | Maximum foundation cards reached, stock draws |
| `mahjong-solitaire` | Mahjong Solitaire | Matching pairs cleared |
| `monopoly` | Monopoly | Maximum properties owned at a match end, highest ending cash |
| `monopoly-deal` | Monopoly Deal | Maximum property cards held, maximum cards banked, action cards played |
| `scramble` | Scramble | Correct words solved |
| `treasure-hunt` | Treasure Hunt | Dig attempts, game result score |
| `chess` | Chess | Opponent pieces captured, promotions |
| `pirate-go` | Pirate Go | Stones captured, stones placed |
| `scrabble` | Scrabble | Words played, longest word |
| `mahjong` | Mahjong | Winning self-draw finishes, best hand score when player wins |
| `vita-mahjong` | Vita Mahjong | Pairs cleared, best combo, hints used |
| `ayo` | Ayo Ọlọ́pọ́n | Seeds captured, moves played |

The same Monopoly game ID covers its board selection (`hye-city` and `port-royale` in this source). Pirate Go stores its selected mode in game state (`classic` or `go`). The session's optional board ID is preserved in match history where present.

Metrics are derived from the terminal state and recorded move payloads. Where the source engine exposes an explicit event (for example, Whot market moves, Scrabble word moves, Pirate Go captures, Ayo captures), it is used directly. Drafts and Checkers promotion telemetry is recorded on human and bot moves using a derived flag that the rules engine ignores. Metrics do not alter game rules.

## Match result model

Each completed match is normalized to one of: `win`, `loss`, `draw`, `solo-success`, or `solo-failure`. A null winner in a multi-player game is a draw; a null winner in a one-player game is a solo failure. This avoids treating Mahjong Solitaire/Vita Mahjong stuck boards as ordinary draws. A finished result stores the session ID, game and optional board IDs, player identity, opponents, score, move count, duration, reason, timestamps, XP earned, achieved unlocks, and the captured per-game metric values. Repeated delivery of the same session result is idempotent while the session ID remains in retained history. Match history is limited to the newest 500 matches per profile.

## Achievements: 95 total

The catalog is assembled from 22 arcade-wide achievements, three milestones for each of the 22 game IDs (66), and seven special feats (95 unique IDs in total).

**Arcade-wide achievements** cover the first completed match, first win and first draw; 10, 25, 50, 100 and 250 completed matches; 10, 25, 50 and 100 wins; 3, 5 and 10 consecutive wins; completing matches in 5 games, 10 games and all 22 games; and reaching 100, 500, 1,000 and 5,000 XP.

**Every game's three milestones** are: complete its first match (`played-<game-id>`), win its first match (`won-<game-id>`), and reach ten wins (`mastered-<game-id>`). Each game has unique IDs and defined XP rewards in `src/profile/profileStore.ts`.

**Special feats** are: Chess checkmate; finish Ayo with at least 50 seeds credited to the player's score; reach a five-move combo in Vita Mahjong; finish Scrabble with at least 100 points; complete Solitaire in fewer than 100 moves; finish Pirate Go with at least 10 captures credited to the player; and complete a match with at least 150 recorded moves. A feat only unlocks when the qualifying data is present.

## Titles: 30 total

Eight arcade titles are included: Arcade Newcomer (default), Arcade Regular (25 matches), Arcade Veteran (100 matches), Arcade Legend (250 matches), Arcade Champion (50 wins), Arcade All-Rounder (10 distinct games), Arcade Completionist (all 22 games), and Unstoppable (a ten-win streak). Each of the 22 games adds one themed title; its qualification is five wins in that game. Titles are collected separately from the active title, so players can earn new titles without having them automatically replace their current one. Unlocked titles can be equipped in the profile screen.

## XP and streak accounting

Base match XP is determined by outcome and the local player's move count. A win starts at 35 XP, a loss at 12 XP, a draw at 18 XP, a solo success at 40 XP, and a solo failure at 8 XP. Activity bonuses grow by one XP per ten player moves and are capped per outcome. Newly unlocked achievements add their catalog XP reward; XP thresholds are rechecked after rewards to prevent missed milestone unlocks.

Win streaks increase on wins and solo successes. Losses update the loss streak and reset the win streak; draws and solo failures reset the win streak. Best streaks are retained. Per-game stats include match outcomes, scores, total moves, total XP, fastest win, last played time and the per-game metrics above. Sum metrics accumulate; max metrics retain the best observed value.

## Profiles, persistence and backup

- Up to 12 local profiles may be stored on a device; each has a bounded display name, an active title, unlocked achievements/titles, total XP, streaks, history and per-game stats.
- Local profile persistence uses `localStorage` key `hye:profile-library:v1`; the store recovers to a clean starter profile if saved JSON is corrupted or browser storage is unavailable.
- The profile screen supports create/switch/rename, selecting a title, reviewing all game stats, filtering the achievement catalog, browsing recent results, exporting a JSON backup and importing a supported backup. On native Android, export uses Capacitor Filesystem in the Documents directory; in a browser build it downloads the JSON file.
- Import validates the product/schema, game IDs, outcome values, unlock IDs, and per-game metric keys, and normalizes missing older record fields. Import replaces a profile with the same ID or adds it as a new local profile.
- The existing session player's `profileId` is a device-local stable identity. A LAN session can carry each participant's chosen display name/profile ID, but no profile-sync or social transport is implemented by Layer 1.

## Test coverage

Run `npm test` under Node 22+. Tests cover catalog uniqueness, default profiles and name sanitization, awards/stat updates, idempotency, win/loss/draw/solo result classification, special achievements, coverage of all 22 games, metric extraction, five- and ten-win progression, persistence, backup export/import, malformed backup rejection and normalization of older match records.
