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
  assert.ok(gameCode.includes('getWorldPoint'));
  assert.ok(gameCode.includes('setPointerCapture'));
  assert.ok(!gameCode.includes('input.activePointer'));
  assert.ok(!/Usion\.(ready|user\.info)|Usion\.game\.emit/.test(platformCode));
});

test('mobile boots directly into automatic landscape with dedicated Hina ability input', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const orientation = await readFile(new URL('../src/ui/orientation.js', import.meta.url), 'utf8');
  const input = await readFile(new URL('../src/game/InputController.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /orientation-gate|ROTATE TO LANDSCAPE/);
  assert.match(html, /id="ability-button"/);
  assert.match(main, /requestLandscape\(\)/);
  assert.match(main, /gameViewportSize\(\)/);
  assert.match(main, /game\.scale\.resize/);
  assert.match(input, /event\.button === 2/);
  assert.match(css, /html\.mobile-rotated #app/);
  assert.match(css, /rotate\(90deg\)/);
  assert.match(css, /#game canvas[^}]*width:\s*100%\s*!important[^}]*height:\s*100%\s*!important/s);
  assert.match(css, /html\.mobile-rotated \.ability-button[^}]*bottom:\s*max\(180px/s);
  assert.match(orientation, /--app-viewport-width/);
  assert.match(orientation, /--app-viewport-height/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /max-height:\s*600px/);
});
