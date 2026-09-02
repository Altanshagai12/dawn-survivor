import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HERO_ATLASES, WEAPONLESS_HERO_ATLASES } from '../src/config/assets.js';
import { prepareWeaponlessHero } from '../scripts/import-weaponless-heroes.mjs';
import { weaponHandPosition } from '../src/game/WeaponHandAnchors.js';

test('all 192 weaponless frames keep original geometry, opaque bodies and transparent gutters', async () => {
  for (const [id, atlas] of Object.entries(WEAPONLESS_HERO_ATLASES)) {
    const original = HERO_ATLASES[id];
    assert.equal(atlas.frameWidth, original.frameWidth);
    assert.equal(atlas.frameHeight, original.frameHeight);
    assert.notEqual(atlas.key, original.key);
    const file = new URL(`../${atlas.file.split('?')[0]}`, import.meta.url);
    const { data, info } = await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, atlas.frameWidth * 6);
    assert.equal(info.height, atlas.frameHeight * 8);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
      let visible = 0, solid = 0, green = 0, gutter = 0;
      for (let y = 0; y < atlas.frameHeight; y++) for (let x = 0; x < atlas.frameWidth; x++) {
        const offset = ((row * atlas.frameHeight + y) * info.width + col * atlas.frameWidth + x) * 4;
        const [r, g, b, a] = data.subarray(offset, offset + 4);
        if (a >= 16) visible++;
        if (a >= 240) solid++;
        if (a >= 64 && g > 175 && g - Math.max(r, b) > 75) green++;
        if ((x < 2 || y < 2 || x > atlas.frameWidth - 3 || y > atlas.frameHeight - 3) && a >= 16) gutter++;
      }
      const label = `${id} frame ${row * 6 + col}`;
      assert.ok(visible / (atlas.frameWidth * atlas.frameHeight) > .09, `${label}: missing body`);
      assert.ok(visible / (atlas.frameWidth * atlas.frameHeight) < .55, `${label}: opaque background`);
      assert.ok(solid / visible > .72, `${label}: translucent body`);
      assert.equal(green, 0, `${label}: leftover technical matte`);
      assert.ok(gutter < 20, `${label}: bleeding across cell`);
      const hand = weaponHandPosition(id, {
        x: 0, y: 0, originX: 0, originY: 0, scaleX: 1, scaleY: 1,
        width: atlas.frameWidth, height: atlas.frameHeight, frame: { name: row * 6 + col },
      });
      let attached = false;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = Math.round(hand.x) + dx, y = Math.round(hand.y) + dy;
        const offset = ((row * atlas.frameHeight + y) * info.width + col * atlas.frameWidth + x) * 4;
        if (data[offset + 3] >= 240) attached = true;
      }
      assert.ok(attached, `${label}: hand anchor floats outside the actual body artwork`);
    }
  }
});

test('runtime atlases reproduce from retained matte edits without a second lossy encode', async () => {
  for (const [id, atlas] of Object.entries(HERO_ATLASES)) {
    const directory = new URL('../assets/sprites/heroes/weaponless/', import.meta.url);
    const input = await readFile(new URL(`source/${id}-matte.png`, directory));
    const generated = await prepareWeaponlessHero(input, atlas);
    const published = await readFile(new URL(`${id}-atlas.webp`, directory));
    assert.deepEqual(published, generated, id);
  }
});
