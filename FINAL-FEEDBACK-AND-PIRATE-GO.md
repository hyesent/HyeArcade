# Hye Arcade — Final Feedback and Pirate Go Pass

## What changed

- Pirate Go now has **Classic Pirate** and **Traditional Go** modes selected before the first stone is played.
- Traditional Go includes group liberties, captures, suicide prevention, positional superko, pass-to-scoring flow, dead-group marking, mutual score confirmation, Chinese-style area scoring, and 7.5 komi for White.
- Classic Pirate retains capture-count scoring after two passes.
- Illegal moves now receive contextual, game-specific guidance instead of only a generic error sound/message.
- Whot explains mismatched shapes/numbers, called-shape restrictions, Market use, and Pick Two/Pick Three counters.
- Mahjong Solitaire and Vita Mahjong explain blocked tiles, mismatched pairs, and tray restrictions.
- Checkers and Drafts explain illegal destinations and their different capture rules; Drafts coordinates now support 10×10.
- The player handbook was updated for Pirate Go, Whot, Checkers, and Drafts.

## Verification

Passed: strict logic TypeScript compile, Go mode/capture/suicide/superko/scoring smoke tests, Whot penalty-counter tests, and TS/TSX syntax transpilation for changed files.

Not yet verified: full Vite production build, Android APK build, visual test on a physical device, and multiplayer/LAN play-through. These remain release checks, not claimed successes.
