import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PREMIUM_SKINS, skinProjectileAnchor } from '../src/data/skins.js';
import { WEAPONS } from '../src/data/weapons.js';
import { skinProjectileEnvelope } from '../src/data/skinProjectileBounds.js';
import { premiumProjectileCoreScale, premiumProjectileScale } from '../src/game/PremiumVfxDirector.js';

test('all 32 opaque skin projectile cores fit the shared 25% larger hit radius, including size upgrades', async () => {
  const frames = { revolver: 5, shotgun: 6, crossbow: 3, flame: 4 };
  for (const skin of Object.values(PREMIUM_SKINS)) {
    const path = fileURLToPath(new URL(`../${skin.vfxAtlas.split('?')[0]}`, import.meta.url));
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const weapon of Object.values(WEAPONS)) {
      const frame = frames[weapon.id], anchor = skinProjectileAnchor(skin, weapon.id);
      const left = frame % 4 * 256, top = Math.floor(frame / 4) * 256;
      let envelope = 0, visible = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const offset = ((top + y) * info.width + left + x) * 4;
        const light = data[offset + 3] * Math.max(data[offset], data[offset + 1], data[offset + 2]) / 255;
        if (light < 8) continue;
        visible++;
        envelope = Math.max(envelope, Math.hypot(x + .5 - anchor.x * 256, y + .5 - anchor.y * 256) + Math.SQRT1_2);
      }
      assert.ok(visible > 100, `${skin.id}/${weapon.id} must contain visible art`);
      assert.equal(skinProjectileEnvelope(skin, weapon.id), Math.ceil(envelope), `${skin.id}/${weapon.id} stored envelope matches pixels`);
      for (const sizeMultiplier of [.45, 1, 1.4, 2.8]) {
        const size = weapon.bulletSize * sizeMultiplier;
        const scale = premiumProjectileCoreScale(size, weapon.id, skin);
        const radius = size / 2 * 1.25;
        assert.ok(envelope * scale <= radius, 'opaque core cannot overpromise its damage radius');
        assert.ok(envelope * scale > radius * .98, 'opaque core is fitted to the shared hitbox');
      }
    }
  }
});

test('all 32 outer skin effects are the exact midpoint between pre-parity and tight sizes', () => {
  // Frozen release references: fb2dc15 (large) and 19a7bed (tight).
  // Do not derive the tight reference from the newly increased collision radius.
  const legacyBase = { revolver: .19, shotgun: .1, crossbow: .33, flame: .23 };
  for (const skin of Object.values(PREMIUM_SKINS)) for (const weapon of Object.values(WEAPONS)) {
    for (const sizeMultiplier of [.45, 1, 1.4, 2.8]) for (const powerScale of [1, 1.72]) {
      const size = weapon.bulletSize * sizeMultiplier;
      const oldScale = legacyBase[weapon.id] * Math.max(.72, size / 8) * 1.65 * powerScale;
      const tightScale = size / (2 * skinProjectileEnvelope(skin, weapon.id));
      const expected = (oldScale + tightScale) / 2;
      const actual = premiumProjectileScale(size, weapon.id, skin, powerScale);
      assert.ok(Math.abs(actual - expected) < 1e-12,
        `${skin.id}/${weapon.id}/${sizeMultiplier}/${powerScale}: exact arithmetic midpoint`);
      assert.ok(actual > tightScale && actual < oldScale, 'midpoint preserves recognizable skin art');
      assert.ok(premiumProjectileCoreScale(size, weapon.id, skin) < actual,
        'outer energy stays distinct from the fitted, opaque hit core');
    }
  }
});
