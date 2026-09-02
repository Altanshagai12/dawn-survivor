import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { assertWeaponArt, removeGreenMatte } from '../scripts/weapon-art-alpha.mjs';

test('matte import preserves dark metal, highlights and colored weapon interiors', () => {
  const foreground = Buffer.from([0, 0, 0, 255, 20, 21, 22, 255, 230, 230, 230, 255,
    120, 20, 190, 255, 30, 180, 220, 255, 210, 145, 45, 255]);
  assert.deepEqual(removeGreenMatte(foreground), foreground);
  assert.deepEqual([...removeGreenMatte(Buffer.from([0, 255, 0, 255]))], [0, 0, 0, 0]);
  assert.deepEqual([...removeGreenMatte(Buffer.from([37, 233, 35, 255]))], [0, 0, 0, 0]);
  assert.deepEqual([...removeGreenMatte(Buffer.from([0, 128, 0, 255]))], [0, 0, 0, 127]);
});

test('all 32 weapon skins contain a substantial centered silhouette', async () => {
  for (const skin of Object.values(PREMIUM_SKINS)) for (const [weapon, asset] of Object.entries(skin.weaponArt)) {
    const path = new URL(`../${asset.split('?')[0].replace(/^\.\//, '')}`, import.meta.url);
    const { data, info } = await sharp(fileURLToPath(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assertWeaponArt(data, info.width, info.height, `${skin.id}/${weapon}`);
  }
});

test('legacy extraction cannot erase dark parts or prune detached weapon ornaments', async () => {
  const entry = await readFile(new URL('../scripts/extract-skin-weapon-art.mjs', import.meta.url), 'utf8');
  const importer = await readFile(new URL('../scripts/import-weapon-art.mjs', import.meta.url), 'utf8');
  assert.match(entry, /import '\.\/import-weapon-art\.mjs'/);
  assert.doesNotMatch(entry + importer, /keepLargestAlphaComponent|clearPackBackground|clearWhiteFringe/);
  assert.match(importer, /assertWeaponArt/);
});
