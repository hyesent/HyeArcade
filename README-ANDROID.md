# Hye Arcade Android / APK build

The checked-in `android/` directory is intentional. It contains the Capacitor Android app, launcher/splash assets, and the custom native `LanHostPlugin` implementation.

## Build through GitHub Actions

The workflow in `.github/workflows/android-apk.yml` runs on pushes to `main`, version tags (`v*`), or a manual workflow dispatch. It installs Node dependencies, builds the web app, syncs Capacitor, prepares LAN/cleartext configuration, builds the debug APK, renames it to `HyeArcade.apk`, and uploads the artifact.

## Local build

Use a network-enabled environment with Node.js 22, Java 21, Android SDK, and a working Gradle download:

```bash
npm ci
npm run build
npx cap sync android
npm run cap:android:prepare
cd android
./gradlew assembleDebug
```

The expected original debug output is `android/app/build/outputs/apk/debug/app-debug.apk`; CI renames it to `HyeArcade.apk` before uploading. The project is not intended to build Gradle inside an unconfigured Termux environment.

## Native LAN implementation

`app/src/main/java/com/hye/arcade/LanHostPlugin.java` registers the Capacitor `LanHost` plugin. It provides an embedded HTTP/SSE room relay and UDP discovery for nearby Hye Arcade hosts. Raw guest move requests are delivered to the host; accepted moves, session views, chat, reactions, and public events use the room event stream.

Source integration is not physical-device verification. Test at least two Android phones on the same Wi-Fi and on a host-phone hotspot. Check discovery, joining, turns in both directions, hidden information in Battleship/Hearts/Dominoes, and reconnect behaviour.

The local relay uses plaintext traffic and is intended only for trusted nearby networks. Do not expose it to the public Internet. Public online play requires a separate secured relay and stronger authentication.
