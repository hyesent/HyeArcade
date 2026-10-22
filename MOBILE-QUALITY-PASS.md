# Hye Arcade — mobile quality pass (follow-up)

## Changes in this pass
- Vita Mahjong now shows short-lived, accessible praise popups after successful pairs. Fast streaks are timed over a rolling 10-second window and use remarks such as **Quick Eyes**, **Sharp Hands**, **Amazing**, and **Unstoppable**. Combo score rules remain in the game engine.
- Ludo yard coordinates were corrected to match the supplied board image: red stays top-left, green top-right, yellow bottom-right, and blue bottom-left. This fixes pawns appearing in the wrong colour home/yard areas.
- The existing Monopoly/Hye City board SVG was retained and its Chance and Community Chest illustrations were refined with better contrast, borders, card headers, and clearer symbols. The board itself was not replaced.
- The existing project uses Hye City and Port Royale as its two Monopoly boards; no Paris/London board was added.

## Verification status
- Source edits were applied to `src/games/vita-mahjong/VitaMahjong.tsx`, `src/games/ludo/board-map.ts`, and `src/games/DedicatedGameScreen.tsx`.
- `npm run build` was attempted but cannot currently complete because the extracted project has no usable installed React dependencies (`Cannot find module 'react'`). This is an environment/dependency issue, so this ZIP should not be described as a successful production build or device-tested release.
