# Native Android LAN Host — 17 October 2026

## What is now in the project

- `android/app/src/main/java/com/hye/arcade/LanHostPlugin.java` implements the Capacitor `LanHost` plugin.
- `android/app/src/main/java/com/hye/arcade/MainActivity.java` registers the plugin.
- `android/app/src/main/AndroidManifest.xml` includes local networking, Wi-Fi state, multicast, and cleartext permissions.
- `scripts/prepare-android.mjs` ensures the required permissions remain present after Android preparation.
- `.github/workflows/android-apk.yml` preserves the checked-in Android project instead of always regenerating it.

## Transport design

- The host opens an embedded HTTP server on the first available port in `8787–8797`.
- UDP discovery listens on port `47872`. A joining device broadcasts a discovery request and receives the host's base URL, then checks the requested room code over HTTP.
- Room state is held in memory on the host phone. Server-Sent Events deliver room snapshots and shared events.
- A guest's raw pending move is delivered only to the host and uses sequence `0`, so it does not create a public event-sequence gap. The host validates/applies the move and publishes a shared `move.accepted` event.
- Session snapshots preserve canonical room membership and require a per-player view for private-information games. Guest history contains sanitized summaries rather than raw move payloads.
- The host can register configured bot seats and the selected board/mode at room start.
- The stream has keepalives, a reconnect grace period, and delayed coordinator reassignment for games whose state is public. Private-information games keep the original host as coordinator rather than promoting a guest with redacted state.

## Important limits

This is a source implementation, **not a verified Android release**. The environment could not download the Gradle 8.11.1 distribution from `services.gradle.org`, so I could not compile the plugin or build an APK. No physical Android device was available for hotspot/Wi-Fi discovery tests.

The relay is intended for a trusted local network only:

- HTTP/SSE is plaintext; room codes and membership checks are not encryption or strong authentication.
- Room state and event history are in memory and disappear when the host process stops.
- UDP broadcast can be blocked by access-point isolation, Android network policy, or some hotspot implementations.
- The host process must remain alive; process death loses the room.
- Host reassignment is delayed and simple, not a conflict-free election. Private-information games intentionally do not auto-promote a guest to authority.
- Every game still needs real-device testing for its move types, private views, chat, reconnects, and UI behavior.

## Next verification steps

1. Install dependencies in a network-enabled environment and run `npm run build`.
2. Run `npx cap sync android`, `npm run cap:android:prepare`, and `cd android && ./gradlew assembleDebug`.
3. Install the APK on two physical Android phones.
4. Test phone A hosting on Wi-Fi and on its hotspot; test phone B discovering/joining by room code.
5. Test at least one hidden-information game (UNO/Whot), Ludo, Monopoly, and Pirate Go in both directions. Verify that pending private moves are not visible to other guests, accepted moves stay in order, host disconnects are handled, and the lobby-selected board/mode matches on every phone.

The future Internet mode should reuse the typed event protocol behind a reachable online relay. It should not expose this local plaintext host directly to the Internet.
