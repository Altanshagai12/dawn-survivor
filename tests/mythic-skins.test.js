import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

import { PREMIUM_SKINS, SKINS_BY_HERO } from '../src/data/skins.js';
import { AUDIO_BANK_FILES } from '../src/game/WeaponAudioProfiles.js';

const GAMEPLAY_KEYS = new Set([
  'damage', 'hp', 'maxHp', 'speed', 'moveSpeed', 'fireRate', 'projectileSpeed',
  'magazine', 'reload', 'enemy', 'spawn', 'hitbox', 'duration', 'range', 'knockback',
]);

function assetUrl(asset) {
  return new URL(asset.split('?')[0].replace(/^\.\//, '../'), import.meta.url);
}

test('mythic collection stays cosmetic-only and free during prototype review', () => {
  const skins = Object.values(PREMIUM_SKINS);
  const mythics = skins.filter(({ rarity }) => rarity === 'mythic');
  assert.equal(skins.length, 8);
  assert.equal(mythics.length, 4);
  assert.ok(Object.values(SKINS_BY_HERO).every((heroSkins) => heroSkins.length === 2));
  assert.ok(mythics.every(({ priceCredits }) => priceCredits >= 500));
  assert.equal(new Set(mythics.map(({ motif }) => motif)).size, 4);
  for (const skin of skins) {
    for (const key of Object.keys(skin)) assert.equal(GAMEPLAY_KEYS.has(key), false, `${skin.id}.${key}`);
    assert.equal(skin.heroAtlas.weaponless, true);
  }
});

test('every authored hero atlas is centered, foot-locked, and transparent at cell edges', async () => {
  for (const skin of Object.values(PREMIUM_SKINS)) {
    const { frameWidth, frameHeight } = skin.heroAtlas;
    const url = assetUrl(skin.heroAtlas.file);
    const { data, info } = await sharp(fileURLToPath(url)).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [frameWidth * 6, frameHeight * 8]);
    for (let row = 0; row < 8; row += 1) {
      const frames = [];
      for (let column = 0; column < 6; column += 1) {
        let area = 0;
        let weightedX = 0;
        let bottom = 0;
        for (let y = 0; y < frameHeight; y += 1) for (let x = 0; x < frameWidth; x += 1) {
          const alpha = data[(((row * frameHeight + y) * info.width)
            + column * frameWidth + x) * 4 + 3] / 255;
          if (!alpha) continue;
          area += alpha;
          weightedX += x * alpha;
          bottom = Math.max(bottom, y);
          assert.ok(x > 0 && y > 0 && x < frameWidth - 1 && y < frameHeight - 1);
        }
        frames.push({ area, center: weightedX / area * 78 / frameHeight, bottom });
      }
      const centers = frames.map(({ center }) => center);
      const bottoms = frames.map(({ bottom }) => bottom);
      const areas = frames.map(({ area }) => area).sort((a, b) => a - b);
      const median = areas[Math.floor(areas.length / 2)];
      assert.ok(Math.max(...centers) - Math.min(...centers) <= 2, `${skin.id} row ${row} center`);
      assert.ok(Math.max(...bottoms) - Math.min(...bottoms) <= 1, `${skin.id} row ${row} feet`);
      assert.ok((Math.max(...areas) - Math.min(...areas)) / median <= .08, `${skin.id} row ${row} area`);
    }
  }
});

test('skin storefront uses optimized card, VFX, weapon, and five-file audio assets', async () => {
  for (const skin of Object.values(PREMIUM_SKINS)) {
    const card = await sharp(fileURLToPath(assetUrl(skin.cardArt))).metadata();
    assert.deepEqual([card.width, card.height], [480, 320]);
    const vfx = await sharp(fileURLToPath(assetUrl(skin.vfxAtlas))).metadata();
    assert.deepEqual([vfx.width, vfx.height, vfx.hasAlpha], [1024, 1024, true]);
    let audioBytes = 0;
    for (const bank of AUDIO_BANK_FILES) {
      const url = assetUrl(`${skin.audioBank}/${bank}.wav`);
      await access(url);
      audioBytes += (await stat(url)).size;
    }
    assert.ok(audioBytes < 1_500_000, `${skin.id} selected audio budget`);
  }
});

test('runtime loads only the selected skin and releases storefront preview media', async () => {
  const game = await readFile(new URL('../src/game/GameScene.js', import.meta.url), 'utf8');
  const shop = await readFile(new URL('../src/ui/SkinShopController.js', import.meta.url), 'utf8');
  assert.match(game, /skinWeaponKey/);
  assert.match(game, /skin\.weaponArt\[this\.selection\.weaponId\]/);
  assert.match(game, /mirrorLeft: !this\.state\.skin/);
  assert.match(shop, /SKINS_BY_HERO/);
  assert.match(shop, /WEAPON_IDS/);
  assert.match(shop, /disposePreviewMedia\(\)/);
  assert.doesNotMatch(game, /three/i);
});
