# LAN multiplayer guide

## What is included

The app has a shared game-session transport, host-authoritative move handling, player-specific state projections for hidden-information games, chat/reactions, and a native Android room host/discovery plugin. New multiplayer games use the same `GameDefinition` contract and are registered with `supports.lan: true` where applicable.

The expansion enables LAN integration for Dominoes, Othello/Reversi, Backgammon, Battleship, Memory Match, and Hearts. Battleship projects opponent ship locations as hidden; Hearts projects other players' hands as hidden; Dominoes projects opponent tile identities as hidden. These are source-level protections and still require device-to-device verification.

## Local network requirements

1. Put the host and guest devices on the same trusted Wi-Fi network or a phone hotspot.
2. Open Hye Arcade on both devices.
3. On the host, create a LAN room and wait for the guest to join.
4. Check that the player list shows both devices before starting.
5. Test several turns in both directions, including a disconnect/reconnect if supported by the current host flow.

If using the Node development relay instead of the native Android host, start it on a trusted computer:

```bash
npm run lan-server -- --host 0.0.0.0 --port 8787
npm run dev -- --host 0.0.0.0
```

Use the host computer's LAN IP and port `8787` in the app's LAN connection dialog.

## Security and limitations

The embedded local relay uses plaintext HTTP/SSE and is intended only for trusted nearby networks. Do not expose it to the public Internet. Room membership and room codes are not equivalent to strong Internet authentication. Public online play needs a separate secured relay and stronger authentication.

Source integration is not the same as physical-device verification. Android Wi-Fi multicast/discovery, hotspot routing, reconnects, and every game's private-state view must be tested on real devices before declaring LAN production-ready.
