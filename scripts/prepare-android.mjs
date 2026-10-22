import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectDir = path.resolve(process.env.ANDROID_PROJECT_DIR || 'android');
const manifestPath = path.join(projectDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest;
try {
  manifest = await readFile(manifestPath, 'utf8');
} catch {
  console.error(`Android manifest not found at ${manifestPath}. Run "npx cap add android" and "npx cap sync android" first.`);
  process.exit(1);
}

if (!/<manifest\b[^>]*\bxmlns:android\s*=/.test(manifest)) {
  console.error(`AndroidManifest.xml is missing the android XML namespace: ${manifestPath}`);
  process.exit(1);
}

if (!/<application\b/.test(manifest)) {
  console.error(`AndroidManifest.xml has no <application> element: ${manifestPath}`);
  process.exit(1);
}

// Capacitor serves the app from an HTTPS origin. The LAN host transport uses HTTP
// on the local Wi-Fi network, so Android must permit cleartext app requests.
const cleartextAttribute = /(?:android:)?usesCleartextTraffic\s*=\s*(["'])[^"']*\1/;
if (cleartextAttribute.test(manifest)) {
  manifest = manifest.replace(cleartextAttribute, 'android:usesCleartextTraffic="true"');
} else {
  manifest = manifest.replace(/<application\b/, '<application android:usesCleartextTraffic="true"');
}

if (!/android\.permission\.INTERNET/.test(manifest)) {
  manifest = manifest.replace(/<application\b/, '<uses-permission android:name="android.permission.INTERNET" />\n    <application');
}

if (!/android\.permission\.ACCESS_NETWORK_STATE/.test(manifest)) {
  manifest = manifest.replace(/<application\b/, '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <application');
}

for (const permission of ['android.permission.ACCESS_WIFI_STATE', 'android.permission.CHANGE_WIFI_MULTICAST_STATE']) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(/<application\b/, `<uses-permission android:name="${permission}" />\n    <application`);
  }
}

await writeFile(manifestPath, manifest, 'utf8');
console.log(`Android manifest ready for local-network HTTP requests: ${manifestPath}`);
