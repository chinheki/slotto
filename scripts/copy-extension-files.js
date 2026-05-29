import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const copyTargets = [
  ['src/background', 'dist/src/background'],
  ['src/content', 'dist/src/content'],
  ['src/services', 'dist/src/services'],
  ['src/adapters', 'dist/src/adapters']
];

await mkdir('dist', { recursive: true });
await loadEnvFile('.env');
await writeManifest();

for (const [from, to] of copyTargets) {
  await cp(from, to, { recursive: true });
}

console.log('extension files copied');

async function writeManifest() {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const clientId = process.env.SLOTTO_GOOGLE_OAUTH_CLIENT_ID || process.env.VITE_SLOTTO_GOOGLE_OAUTH_CLIENT_ID;

  if (clientId) {
    manifest.oauth2.client_id = clientId;
  } else {
    console.warn('SLOTTO_GOOGLE_OAUTH_CLIENT_ID is not set; Google OAuth will use the manifest placeholder.');
  }

  await writeFile('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
}

async function loadEnvFile(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (_error) {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
