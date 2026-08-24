import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
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

test('runtime uses Phaser 4 group iteration and real Usion SDK calls', async () => {
  const gameDir = new URL('../src/game/', import.meta.url);
  const modules = (await readdir(gameDir)).filter((file) => file.endsWith('.js'));
  const gameCode = (await Promise.all(modules.map((file) => readFile(new URL(file, gameDir), 'utf8')))).join('\n');
  const platformCode = await readFile(new URL('../src/platform/usion.js', import.meta.url), 'utf8');
  assert.ok(!gameCode.includes('.children.iterate'));
  assert.ok(!gameCode.includes('.setTintFill('));
  assert.ok(gameCode.includes('updateWorldPoint'));
  assert.ok(!/Usion\.(ready|user\.info)|Usion\.game\.emit/.test(platformCode));
});
