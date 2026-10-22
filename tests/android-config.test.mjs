import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repoRoot, 'scripts', 'prepare-android.mjs');

async function withAndroidProject(manifest, run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'hye-android-config-'));
  const androidRoot = path.join(tempRoot, 'android');
  const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
  await mkdir(path.dirname(manifestPath), { recursive: true });
  if (manifest !== null) await writeFile(manifestPath, manifest, 'utf8');
  try { await run({ tempRoot, androidRoot, manifestPath }); }
  finally { await rm(tempRoot, { recursive: true, force: true }); }
}

function runPrepare(androidRoot) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ANDROID_PROJECT_DIR: androidRoot },
  });
}

test('Android prep enables cleartext and network permissions without duplicating them', async () => {
  const original = '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.hye.arcade"><application android:label="Hye Arcade"></application></manifest>';
  await withAndroidProject(original, async ({ androidRoot, manifestPath }) => {
    const first = runPrepare(androidRoot);
    assert.equal(first.status, 0, first.stderr);
    const updated = await readFile(manifestPath, 'utf8');
    assert.match(updated, /android:usesCleartextTraffic="true"/);
    assert.match(updated, /android:name="android\.permission\.INTERNET"/);
    assert.match(updated, /android:name="android\.permission\.ACCESS_NETWORK_STATE"/);
    assert.match(updated, /android:name="android\.permission\.ACCESS_WIFI_STATE"/);
    assert.match(updated, /android:name="android\.permission\.CHANGE_WIFI_MULTICAST_STATE"/);
    const second = runPrepare(androidRoot);
    assert.equal(second.status, 0, second.stderr);
    const repeated = await readFile(manifestPath, 'utf8');
    assert.equal((repeated.match(/android\.permission\.INTERNET/g) ?? []).length, 1);
    assert.equal((repeated.match(/android\.permission\.ACCESS_NETWORK_STATE/g) ?? []).length, 1);
    assert.equal((repeated.match(/android\.permission\.ACCESS_WIFI_STATE/g) ?? []).length, 1);
    assert.equal((repeated.match(/android\.permission\.CHANGE_WIFI_MULTICAST_STATE/g) ?? []).length, 1);
    assert.equal((repeated.match(/usesCleartextTraffic=/g) ?? []).length, 1);
  });
});

test('Android prep overrides an existing false cleartext setting', async () => {
  const original = '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:usesCleartextTraffic="false"></application></manifest>';
  await withAndroidProject(original, async ({ androidRoot, manifestPath }) => {
    const result = runPrepare(androidRoot);
    assert.equal(result.status, 0, result.stderr);
    const updated = await readFile(manifestPath, 'utf8');
    assert.match(updated, /android:usesCleartextTraffic="true"/);
    assert.doesNotMatch(updated, /usesCleartextTraffic="false"/);
  });
});

test('Android prep fails clearly when the generated Android project is missing', async () => {
  await withAndroidProject(null, async ({ androidRoot }) => {
    const result = runPrepare(androidRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Android manifest not found/i);
  });
});
