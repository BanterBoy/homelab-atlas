import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('public/icon-data.js');
const before = await readFile(output, 'utf8');
execFileSync(process.execPath, ['scripts/build-icons.mjs'], { stdio: 'ignore' });
const after = await readFile(output, 'utf8');
if (before !== after) throw new Error('public/icon-data.js is stale; run npm run build:icons.');

const manifest = JSON.parse(await readFile('public/licenses/logo-sources.json', 'utf8'));
const { ICON_DATA } = await import('../public/icon-data.js');
const { LOGO_IDS } = await import('../public/catalog.js');
if (manifest.length < 60) throw new Error('Expected at least 60 attributed brand icons.');
for (const { id } of manifest) {
  if (!ICON_DATA[id] || !LOGO_IDS.has(id)) throw new Error(`Unintegrated attributed icon: ${id}`);
}
