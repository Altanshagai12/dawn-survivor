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

test('deployment keeps static gameplay, free-preview gating, and a dormant settlement boundary', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(vercel.cleanUrls, true);
  assert.equal(vercel.trailingSlash, false);
  assert.ok(!('builds' in vercel));
  const purchaseApi = await readFile(new URL('../api/purchase-skin.js', import.meta.url), 'utf8');
  assert.match(purchaseApi, /wallet\/receipt\/\$\{path\}/);
  assert.match(purchaseApi, /verify-pending/);
  assert.match(purchaseApi, /already_settled/);
  const skins = await readFile(new URL('../src/data/skins.js', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(skins, /SKIN_ACCESS_MODE = 'free-preview'/);
  assert.match(main, /if \(SKIN_ACCESS_MODE === 'paid'\)/);
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
  assert.match(gameCode, /submitScore\(survivalMs/);
  assert.match(gameCode, /duration_ms:\s*survivalMs/);
  assert.ok(!gameCode.includes('input.activePointer'));
  assert.doesNotMatch(gameCode, /three(?:\.min)?\.js|from ['\"]three['\"]/i);
  assert.ok(!/Usion\.(ready|user\.info)|Usion\.game\.emit/.test(platformCode));
});

test('mobile boots directly into automatic landscape with dedicated Hina ability input', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const orientation = await readFile(new URL('../src/ui/orientation.js', import.meta.url), 'utf8');
  const input = await readFile(new URL('../src/game/InputController.js', import.meta.url), 'utf8');
  const weaponAudio = await readFile(new URL('../src/game/PremiumWeaponAudio.js', import.meta.url), 'utf8');
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
  assert.match(main, /GameScene\.js\?build=20260901h/);
  assert.match(main, /runLifecycle\.js\?build=20260901i/);
  assert.match(main, /UIController\.js\?build=20260901i/);
  assert.match(html, /main\.js\?build=20260901i/);
  assert.match(html, /skin-shop\.css\?build=20260901b/);
  assert.match(main, /resolution:\s*gameRenderResolution\(window\.devicePixelRatio, renderProfile\)/);
  assert.match(main, /render:\s*\{\s*antialias:\s*true,\s*pixelArt:\s*false,\s*roundPixels:\s*true\s*\}/);
  assert.doesNotMatch(css, /--app-viewport-(?:width|height)[^;]*\+\s*2px/);
  assert.match(html, /minimum-scale=1,maximum-scale=1/);
  assert.match(css, /-webkit-touch-callout:\s*none/);
  assert.match(css, /-webkit-user-select:\s*none/);
  assert.doesNotMatch(html, /reload-fill|reload-state/);
  assert.match(weaponAudio, /AudioContext/);
  assert.doesNotMatch(html, /<audio|\.mp3|\.wav|\.ogg/);
  assert.match(css, /html\.mobile-rotated \.ability-button[^}]*bottom:\s*max\(180px/s);
  assert.match(orientation, /--app-viewport-width/);
  assert.match(orientation, /--app-viewport-height/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /max-height:\s*600px/);
});
