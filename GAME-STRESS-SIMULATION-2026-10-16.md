# Hye Arcade — Randomized Game Stress Simulation

**Run date:** 2026-10-16

## Summary

Three independent randomized batches were run against all 22 registered game definitions. Each batch attempted 12 runs per game, using each game's minimum player count and up to 60 accepted legal moves per run. The harness checks game setup, legal-move validation/application, terminal-state checks, and each registered per-player view. For games that explicitly support out-of-turn responses, the harness also checks valid out-of-turn actions.

| Measure | Result |
|---|---:|
| Registered games | 22 |
| Simulation runs | 792 |
| Accepted game moves | 36,495 |
| Runs reaching a terminal state within the cap | 311 |
| Detected no-legal-move stalls | 0 |
| Setup exceptions | 0 |
| Invalid/missing view assertions | 0 |
| Missing private-state projections | 0 |

Many runs intentionally reached the 60-move cap rather than a win/loss, especially games that can continue for a long time. Those are capped runs, not failed matches.

## Repeat it

After installing the project dependencies:

```bash
npm run test:games
```

The command exits unsuccessfully if it detects a setup exception, a no-legal-move stall, a malformed view, or a missing private-game projection.

## Scope limits

This is randomized source-level logic simulation, not exhaustive proof of every move or combination. It does not test the React UI by clicking through it, physical-device rendering, Android plugin behavior, hotspot discovery, packet loss between phones, or APK performance. Those remain separate release tests.
