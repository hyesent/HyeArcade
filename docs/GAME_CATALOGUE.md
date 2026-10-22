# Hye Arcade game catalogue

This file describes the registered games in the source tree. It is a source catalogue, not a claim that every rule variant has undergone tournament-level validation.

## Existing games

- Tic-Tac-Toe
- Connect Four
- Gomoku
- Snake & Ladder
- Ludo
- Drafts (international draughts variant)
- Checkers (American/English movement variant)
- Crazy Eights
- UNO
- Whot
- Solitaire
- Mahjong Solitaire
- Monopoly (Hye Arcade rules and property data)
- Monopoly Deal
- Scramble
- Treasure Hunt
- Chess
- Pirate Go (Classic Pirate and Traditional Go modes)
- Scrabble
- Mahjong
- Vita Mahjong
- Ayo Ọlọ́pọ́n

## Expansion games

| Game | Players | Offline | LAN | Notes |
|---|---:|---|---|---|
| Dominoes | 2–4 | Yes | Yes | Double-six block game; stock drawing and blocked-hand comparison. |
| Othello / Reversi | 2 | Yes | Yes | Standard 8×8 disc-flipping rules. |
| Backgammon | 2 | Yes | Yes | Movement, hits, bar entry, bearing off, doubling cube, and gammon/backgammon scoring. Tournament match play is not included. |
| Battleship | 2 | Yes | Yes | 10×10 grids; ships are automatically placed. Manual fleet placement is not included. |
| 2048 | 1 | Yes | No | 4×4 merging puzzle and score. |
| Minesweeper | 1 | Yes | No | Beginner 9×9/10, Intermediate 16×16/40, and Expert 16×30/99 with first-click protection. |
| Sudoku | 1 | Yes | No | Generated valid solution, editable cells, hints, and mistake tracking. Easy/Medium/Hard change the number of givens; the generator does not yet guarantee unique solutions or expert-calibrated difficulty. |
| Memory Match | 1–4 | Yes | Yes | Easy 4×4, Medium 4×6, and Hard 6×6 matching-pair boards; same-device or LAN multiplayer. |
| Hearts | 4 | Yes | Yes | Four-player trick-taking, passing, penalty scoring, and shooting the moon. |
| Hangman | 1 | Yes | No | Built-in themed word bank, Easy/Medium/Hard word-length selection, letter guesses, and one hint. |

LAN support in the game registry means the game is wired to the existing LAN session path. It is not proof that the native Android LAN plugin has been verified across physical devices. Validate on at least two phones before treating LAN as production-ready.

## Shared architecture

- `src/games/registry.ts` registers the games used by the catalogue and session engine.
- `src/games/expansion/index.ts` contains the new expansion rule engines.
- `src/games/expansion/Screen.tsx` provides their touch-first controls.
- `src/games/game-guides.ts` contains the in-app How to Play text.
- `src/games/descriptions.ts` contains the catalogue summaries.
- `src/core/engine.ts` validates and applies moves to a session.
- `src/core/lan.ts` and the native `LanHostPlugin` provide local-network transport.
