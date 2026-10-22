# Game stress simulation — 17 October 2026

Command used:

```bash
HYE_SIM_RUNS=36 HYE_SIM_MAX_MOVES=80 npm run test:games
```

The harness exercised the 22 registered game definitions with 36 randomized runs per game, up to 80 attempted moves per run. It also checked each available private-state view against its hidden-information invariants.

| Metric | Result |
|---|---:|
| Registered games | 22 |
| Runs per game | 36 |
| Total runs | 792 |
| Accepted moves applied | 45,823 |
| Runs that reached a terminal state within the move limit | 366 |
| Detected no-valid-move stalls | 0 |
| Setup errors | 0 |
| Private-view assertion failures | 0 |
| Missing required private views | 0 |

A run that reached the 80-move limit without finishing is not automatically a failure: Chess, Gomoku, Ludo, Monopoly, and several other games can take more moves. The harness is a logic smoke/stress test, not exhaustive rule verification or a network simulation. It does not validate UI rendering, Android native networking, latency, packet loss, or two-device gameplay.
