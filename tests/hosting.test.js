import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('loads the official Usion SDK before the exact supported Phaser build', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const sdk = 'https://usions.com/usion-sdk.js';
  const phaser = 'https://usions.com/vendor/phaser/4.2.1/phaser.min.js';
  assert.ok(html.includes(sdk));
  assert.ok(html.includes(phaser));
  assert.ok(html.indexOf(sdk) < html.indexOf(phaser));
});

test('deployment remains a static client-only game', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(vercel.cleanUrls, true);
  assert.equal(vercel.trailingSlash, false);
  assert.ok(!('builds' in vercel));
});
