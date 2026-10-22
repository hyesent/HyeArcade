# Hye Arcade — Rule Fixes and Test Notes

## Scramble
- Fixed final-round state so the engine reaches `totalRounds + 1` and emits a result.
- Final skip accounting and round-end log are now preserved.
- Shared offline dictionary is no longer overwritten by the puzzle-answer list.

## Drafts and Checkers
- Drafts now uses international draughts rules on 10×10: flying kings, backward captures for men, compulsory maximum capture, and forced multi-capture continuation.
- Checkers remains 8×8 American/English checkers, with forced multi-jumps and correct game-over timing.
- Both games now validate the captured-piece index, preventing a move payload from turning a capture into a non-capture.
- Bot search preserves the active player during forced capture chains.

## Scrabble
- Bundled 29,127 offline vocabulary entries; no remote dictionary is needed.
- Bot now seeks valid scoring plays instead of always passing.
- Single-tile plays can correctly infer a vertical main word even when a horizontal cross-word also exists.
- Mobile placement UI maps selected rack tiles onto empty cells while allowing matching existing board letters to be part of the word.
- Exchanges and passes both contribute to the consecutive scoreless-turn end condition.
- Word list is broad common vocabulary, not an official tournament lexicon.

## Pirate Go
- Added simple-ko repetition prevention by comparing the resulting board to the previous board position.
- Two passes now reliably finish the game; equal capture totals produce a draw instead of awarding the first player a fake win.
- Board shows each player's capture score and the final result.
- Suicide remains prohibited unless the move captures an enemy group.
- This is a capture-scoring variant, not full territory-scored Go.

## Tests run
- Scramble final-round resolution.
- Checkers opening move count, forced two-jump continuation, and captured-index validation.
- Drafts flying-king landing options and maximum-capture enforcement, plus continuation without switching turns.
- Scrabble dictionary availability, legal bot-vs-bot play, and vertical single-tile word validation.
- Pirate Go random legal plies, single-stone capture, suicide rejection, immediate ko recapture rejection, and draw resolution.
- Pure logic modules passed strict TypeScript compilation; changed TSX syntax passed transpilation.

## Not yet verified
- Full `npm run build`, APK build, and physical-device visual test. Dependencies were not available in the environment and offline installation could not complete.

## Final pass — Pirate Go modes, arcade feedback, and handbook (2026-10-16)

### Pirate Go
- Added a pre-first-move mode selector: **Classic Pirate** preserves the capture-scoring game; **Traditional Go** uses a separate rules path.
- Traditional Go uses a 9×9 board, group-liberty capture, suicide rejection unless the move captures, positional superko for placements, pass handling, and a scoring phase after two consecutive passes.
- Scoring lets players mark/unmark an entire connected group as dead. Any change clears prior confirmations. Each player must confirm the same marking before the game ends.
- Final Traditional Go scoring counts surviving stones plus surrounded territory, with 7.5 komi for White (compact Chinese-style area scoring). Classic Pirate still ends on two passes and compares capture totals.
- Updated Pirate Go’s board controls and handbook to explain both modes and their different scoring rules.

### Player feedback
- Whot now shows a game-specific rule message when a player taps an illegal card, tries to Market-draw while a legal card is available, or attempts a card that cannot counter a Pick Two/Pick Three penalty.
- A pending Whot Market penalty can only be countered by stacking the same penalty card; WHOT itself is not treated as a penalty counter, preventing the accumulated penalty from becoming stranded under a wild card.
- Added distinct illegal-action messages to the shared game dispatcher, including game-specific guidance for card games, chess, Scrabble, Go, Monopoly, draughts, Mahjong, Ayo, and other registered games.
- Checkers/Drafts now explain invalid destinations and compulsory/maximum-capture rules. The shared board coordinate labels now support the 10×10 Drafts board.
- Mahjong Solitaire explains blocked tiles and mismatched pairs; Vita Mahjong explains blocked tiles and a full tray without a matching tile.

### Handbook corrections
- Rewrote Whot instructions to describe this build’s six-card start, Market behavior, WHOT shape call, Pick Two/Pick Three stacking, Hold On (1), Suspension (8), and General Market (14).
- Corrected Checkers to the 8×8 American/English variant and Drafts to the 10×10 international variant with backward man captures, flying kings, maximum-capture selection, and chained captures.
- Pirate Go’s handbook now describes both modes, liberties, captures, suicide, superko, passing, dead-group agreement, territory/area scoring, and komi.

### Tests run for this final pass
- `tsc -p tsconfig.logic.json --pretty false` passed.
- Standalone strict TypeScript compilation of Pirate Go logic passed.
- Pirate Go smoke tests passed for mode selection, capture, suicide rejection, positional-superko rejection, two-pass scoring, alternating score confirmations, komi, and winner resolution.
- Whot rule tests passed for matching Pick Two stacking and rejection of WHOT/ordinary cards as penalty counters.
- TypeScript/TSX transpile syntax checks passed for all changed source files.

### Not verified
- Full Vite production build, APK build, and physical Android visual/network test remain unverified. Dependency installation could not complete in this environment, so the work should receive a full build and device play-through before release.
