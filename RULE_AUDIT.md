# Rule Fix Status — 16 October 2026

> **Status update:** The five targeted games below have received a rule-fix pass. The original audit findings further down are historical observations from before these changes; do not treat them as current status without checking this section.

## Fixed in this build

- **Scramble:** The final turn now advances beyond the configured round limit so the winner/result can be resolved. The final skip is counted and final-round logging is correct. Scramble now shares the bundled offline vocabulary rather than replacing the app dictionary with only its puzzle answers.
- **Drafts:** Uses a 10×10 international draughts ruleset: men capture in all diagonal directions, kings fly along diagonals, captures are mandatory, maximum-capture routes are enforced, and multi-capture turns remain with the same player. Reaching the promotion row during a capture ends that capture turn. The game cannot be declared over while a forced capture chain is unfinished.
- **Checkers:** Keeps the 8×8 American/English rules separate from Drafts, preserves forced multi-jumps, avoids premature game-over checks during a chain, and validates the captured-piece index as part of a move. Bot search now models a forced chain without switching the side prematurely.
- **Scrabble:** Added a bundled offline English vocabulary (29,127 entries), fixed single-tile word-direction inference, improved the mobile play form so existing board letters can be included in a word while only new letters consume rack tiles, added actionable placement feedback, made the bot search for legal scoring words instead of always passing, and made the consecutive scoreless-turn end condition apply to tile exchanges too.
- **Pirate Go:** Now offers Classic Pirate capture scoring and a Traditional Go mode with liberties, captures, suicide prevention, positional superko, pass-to-scoring, dead-group marking and mutual confirmation, Chinese-style area scoring, and 7.5 komi. The guide documents both modes and the 9×9 implementation.

- **Arcade feedback:** Added game-specific move-rejection guidance centrally and direct rule feedback for Whot, Checkers/Drafts, Mahjong Solitaire, and Vita Mahjong. Whot penalty counters now require the same penalty rank; WHOT cannot leave a pending penalty stranded.
- **Handbook:** Updated Whot, Checkers, Drafts, and Pirate Go guides to reflect the implemented rules; Drafts board coordinates now render for all 10 columns.

## Verification performed

- Strict TypeScript compilation passed for the pure game-engine modules used by Scramble, Checkers/Drafts movement logic, Scrabble, Pirate Go, and the shared dictionary.
- Earlier rule smoke tests passed for Scramble final results, Checkers forced multi-jumps, Drafts maximum capture/flying kings, and Scrabble bot moves/vertical single-tile word inference.
- Final-pass Pirate Go smoke tests passed for mode selection, capture, suicide rejection, positional-superko rejection, two-pass scoring, alternating score confirmations, komi, and winner resolution. Whot penalty-counter tests passed.
- Scrabble bot-vs-bot smoke play completed without an illegal move; the observed maximum bot search time in that run was under 300 ms.
- Changed TSX/TS source files passed syntax transpilation.

## Remaining verification limits

- A full production build and Android APK build were **not** completed because this environment has no installed project dependencies and the dependency cache cannot satisfy `npm ci --offline`.
- These changes have not yet been visually tested on a physical Android device.
- Scrabble's bundled word list is broad offline vocabulary, not a tournament-certified official Scrabble lexicon; challenge rules are not implemented.
- Traditional Go has targeted logic smoke coverage, but full match simulation, edge-case life-and-death fixtures, multiplayer/LAN parity, and physical-device visual testing remain outstanding.

---

# Hye Arcade — Rule Audit (October 2026)

## Scope and honesty note

This is a **source-level rule audit plus targeted executable smoke tests**, not a claim that every game has passed a complete match simulation or visual phone QA. I did not change the existing games' rules while auditing them. The implementation work in this pass is the lobby handbook, re-exposing the existing Drafts definition in the catalogue, and adding Ayo. The current checkout has no installed React/TypeScript project dependencies, so the full production build cannot run here (`npm run build` stops at missing `react` and `react/jsx-runtime`).

## Test results actually run

- **Ayo:** 100 randomized complete-game simulations passed. Every move conserved all 48 seeds, and all 100 simulations terminated using the implemented repeated-position draw guard or no-legal-move end condition.
- **Connect Four:** horizontal four-in-a-row detection and lowest-empty-cell landing checks passed.
- **Checkers:** initial board generated legal opening moves.
- **Build:** blocked before project type-check/build because `node_modules` is empty/missing React. No APK or actual-device visual test was performed.
- Other games: static code inspection only in this pass; their entries below are findings and required test coverage, not claims of full test completion.

## Game-by-game findings

### 1. Tic-Tac-Toe — `tic-tac-toe`
- **Looks present:** alternating marks, three-in-a-row win check, full-board draw.
- **Still needs:** tests for every win direction, last-square draw, invalid/out-of-range move rejection, and LAN turn ownership.
- **Priority:** normal regression coverage.

### 2. Connect Four — `connect-four`
- **Smoke-tested:** horizontal win detection and gravity/landing-row calculation passed.
- **Still needs:** vertical and both diagonal wins, full-column rejection, full-board draw, and simultaneous-line edge cases.
- **Priority:** normal regression coverage.

### 3. Gomoku — `gomoku`
- **Looks present:** 15×15 board, five consecutive stones in horizontal/vertical/diagonal directions, full-board draw.
- **Rule choice:** this is freestyle Gomoku; it does not implement Renju restrictions. Overlines are effectively accepted because any five-stone segment wins.
- **Still needs:** diagonal-edge, overline, full-board, and LAN replay tests; make the freestyle variant explicit in help.

### 4. Snakes and Ladders — `snake-ladder`
- **Still needs verification:** exact-finish behavior, ladder/snake endpoint mapping, whether a roll that overshoots the final square is rejected or clamped, and multiplayer/bot completion.
- **Priority:** high enough to test before calling the rules final; the visible board map and engine path must agree.

### 5. Ludo — `ludo`
- **Confirmed house rules in source:** two dice are rolled and their sum moves one pawn; a pawn leaves the yard only when the **sum is 6**; doubles can grant another turn; overshooting the final step is illegal; captures are blocked on safe squares.
- **Difference from common tabletop Ludo:** many versions use one die and a six to enter. The current behavior is a custom Hye Arcade variant, not the universal rule.
- **Placement concern:** the logical yard map matches the current board image at a static inspection, but the colour/start comments in `board-map.ts` contradict the actual `START_STEP` mapping. The on-device complaint about pawns appearing in the wrong homes still needs a coordinate overlay test at phone size; it has not been fixed in this audit.
- **Still needs:** test every colour's yard and start cell, 2/3/4-player seat mapping, animation vs committed position, safe-square capture, doubles/no-move behavior, and exact home entry.

### 6. Checkers — `checkers`
- **Looks present:** mandatory capture, forward movement for men, one-square diagonal king movement, forced continuation from a capturing piece, promotion.
- **Potential rule-state defect:** `isOver` always checks whether the *opposite* player has moves. During a forced multi-jump, the same player still owns the turn, so the game may incorrectly declare a winner if the opponent has no moves before the chain finishes.
- **Still needs:** a regression position where a multi-jump is available and the opponent is temporarily immobile; promotion during a jump; forced-capture validation; no-move win.
- **Priority:** high.

### 7. Drafts — `drafts`
- **Catalogue issue fixed for access only:** the existing Drafts definition was not included in `GAMES`, so its lobby/handbook could not be reached. It is now registered.
- **Major rules gap found:** it uses Checkers logic on a 10×10 board. It does not implement international draughts rules: men cannot capture backward, kings are not flying kings, maximum-capture sequences are not enforced, and a capture chain is not forced through the Drafts `apply` path.
- **Priority:** high. This needs its own proper 10×10 international draughts logic; it was deliberately not rewritten in this audit.

### 8. Crazy Eights — `crazy-eights`
- **Looks present:** suit/rank matching, eights choose a suit, hand-empty win, hidden opponent hands.
- **Still needs:** tests for drawing when no card is playable, whether a drawn card can be played immediately, reshuffling with one discard left, chosen-suit enforcement, and turn direction.
- **Rule choice:** draw/penalty details differ by Crazy Eights variant and should be stated explicitly in the handbook after tests.

### 9. UNO — `uno`
- **Looks present:** round scoring toward 500 points, reverse/skip/draw handling, Wild Draw Four challenge state, and special opening-card handling.
- **Still needs:** scripted tests for Wild Draw Four legality/challenge outcomes, drawing from an empty deck, two-player reverse/skip behavior, UNO call/penalty, and whether stacking is intentionally unsupported.
- **Priority:** high because card-effect edge cases change turn order and scoring.

### 10. Nigerian Whot! — `whot`
- **Visible implementation choices:** 1 gives another turn; 2 adds two to the market; 5 adds three; 8 suspends the next player; 14 General Market makes other players draw and keeps the player in control; WHOT requests a shape.
- **Still needs:** verify every special-card chain, market stacking, drawing from a depleted deck, requested-shape enforcement, and the win case when the last card is a special card.
- **Priority:** high for a rules-first card game. Publish these exact house rules in the guide once confirmed.

### 11. Solitaire — `solitaire`
- **Still needs:** verify tableau legality, stock/waste draw count, recycle/redeal limit, foundation moves, and end-of-game detection against the intended Klondike variant.
- **Priority:** normal; current pass did not execute a complete deal.

### 12. Mahjong Solitaire — `mahjong-solitaire`
- **Rule core:** remove matching free tiles; free means uncovered and at least one side is open.
- **Still needs:** prove every generated layout is solvable, check overlap/free-tile geometry, validate special flower/season matching, and test undo/shuffle/hint against the actual board state.
- **Priority:** high for puzzle fairness.

### 13. Monopoly — Hye City and Port Royale (`monopoly`)
- **Looks present:** two board choices, ownership, rent, colour groups, auctions, building, mortgages, jail, trading, bankruptcy and a log.
- **Still needs:** table-driven tests for every Chance and Community Chest card, card movement that crosses Start, card-induced jail, cash insufficiency/bankruptcy, auction ties/no bidders, full-colour-group rent, even-building constraints, trade validation, and LAN event consistency.
- **Cards/board visuals:** the prior mobile pass changed presentation, not the completeness of the card-effect rule audit. A visual improvement is not proof that every card effect is correct.
- **Priority:** highest due to the number of interacting rules.

### 14. Monopoly Deal — `monopoly-deal`
- **Looks present:** card deck, property sets, bank, rent/action responses, Just Say No path, houses/hotels and three-set win condition.
- **Still needs:** full card-by-card effect tests, debt-payment ordering, mixed bank/property payments, wild-property reassignment, Just Say No counter-response, hand-limit enforcement, deck/discard recycling, and whether all advertised actions are reachable from the UI.
- **Priority:** high.

### 15. Scramble — `scramble`
- **Critical confirmed source defect:** the final-round path returns the state without advancing `round` beyond `totalRounds`, while `scrambleOver` only finishes when `round > totalRounds`. The game can therefore remain unfinished after the intended five rounds.
- **Other limitation:** the built-in dictionary is initialised from the 24 puzzle answers only. This makes the word validator far narrower than a normal word game; the current mechanic is effectively “unscramble the one chosen answer,” not open-ended word finding.
- **Still needs:** fix end-of-round transition later, then test timer expiry, hint penalties, skip scoring, answer acceptance, round rotation, and game-over.
- **Priority:** critical. Not changed in this audit per instruction.

### 16. Treasure Hunt — `treasure-hunt`
- **Looks present:** 8×8 hidden treasure, no duplicate guesses, distance feedback, up to 40 guesses, best-distance tracking.
- **Still needs:** define tie-break behavior when players finish with equal best distance; test that the winner/scoring matches the intended game design; verify bots do not make invalid/repeated guesses.
- **Priority:** normal.

### 17. Chess — `chess`
- **Looks present in logic:** ordinary piece movement, check legality, castling with attacked-square checks, en passant, promotion choices, checkmate and stalemate.
- **Missing standard draw coverage:** no visible threefold-repetition, fifty-move-rule, or insufficient-material draw detection. That means some standard chess games may continue when they should be drawn.
- **Still needs:** castling-rights regression cases, en-passant edge cases, underpromotion, pinned-piece legality, checkmate/stalemate, and draw rules.
- **Priority:** high.

### 18. Pirate Go — `pirate-go`
- **Implemented variant:** 9×9 capture-focused Go-like game; groups with no liberties can be captured; two passes end the game and the current winner is based on capture counts.
- **Major scope limitation:** it is not full Go. Territory scoring, komi, full superko/repetition handling and standard end-of-game territory agreement are not implemented consistently across the two logic paths in this project.
- **Still needs:** consolidate the duplicate Pirate Go rule implementations, test multi-stone group capture, suicide, ko, consecutive passes, and LAN parity.
- **Priority:** high if the game is presented as Go rather than a simplified capture game.

### 19. Scrabble — `scrabble`
- **Looks present:** connected placement validation, word checks, premium squares, blanks, bingo bonus, tile exchange, rack/bag scoring.
- **Critical gameplay limitation:** `scrabbleBot` always passes, so bot opponents do not actually play words.
- **Still needs:** verify the dictionary source and accepted-word breadth, cross-word scoring, blank assignment, first-move centre rule, all premium squares, six-pass ending, endgame rack deductions, and exchange behavior.
- **Priority:** high.

### 20. Mahjong — `mahjong`
- **Scope:** a complex Mahjong ruleset with MCR-style scoring patterns, meld claims, flowers, replacement draws and multi-hand session state.
- **Still needs before claiming standard-rule parity:** reference-hand fixtures for common winning patterns, claim priority, added/concealed kongs, dead-wall exhaustion, flower replacement, 8-fan minimum, dealer/wind rotation, and settlement. Static code review is not enough to certify such a large ruleset.
- **Priority:** highest for correctness; name the exact regional/ruleset variant in the UI.

### 21. Vita Mahjong — `vita-mahjong`
- **Looks present:** matching free tiles, four-slot tray, hints, shuffles, undo/history, score and combo counters.
- **Still needs:** generated-layout solvability checks, no-moves-left handling, tile-overlap geometry tests, tray match/undo score restoration, shuffle preserving tile multiplicities, and combo timer/praise tests on a real phone.
- **Priority:** high for puzzle fairness and touch interaction.

### 22. Ayo Ọlọ́pọ́n — `ayo` (added in this pass)
- **Implemented variant:** 12 pits, four seeds each, counter-clockwise sowing, skip the starting pit on a full lap, capture chains on opponent pits holding 2 or 3, feed-the-opponent rule, captured-seed scoring.
- **Extra safeguard:** a position repeated three times is treated as a draw to prevent an endless match.
- **Tests run:** 100 randomized complete games; all conserved the 48 seeds and terminated.
- **Rule note:** Ayo has regional variants. This is explicitly the Ayoayo 2/3-capture variant, not a claim that every Nigerian household uses the same capture rule.

## Recommended order for the next rule-fix phase

1. Scramble round completion (critical).
2. Drafts: implement actual international draughts rules rather than reusing Checkers movement.
3. Checkers: stop premature game-over during a forced capture chain.
4. Ludo: coordinate overlay tests for each colour/yard/home lane on a real mobile viewport.
5. Monopoly: test every Chance/Community Chest card and all purchase/auction/trade/bankruptcy transitions.
6. Scrabble bot and dictionary coverage.
7. Chess draw rules and scripted special-move cases.
8. UNO/Whot/Crazy Eights card-effect regression suites.
9. Mahjong, Mahjong Solitaire, Vita Mahjong, Solitaire and Treasure Hunt scenario tests.

This document intentionally records issues instead of silently changing their rules during the audit.
