import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO_ATLASES } from '../src/config/assets.js';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { weaponGrip, weaponHandPosition } from '../src/game/WeaponHandAnchors.js';
import { applyWeaponSkin, destroyWeaponSkin, setWeaponSkinVisibility, syncWeaponSkin, WEAPON_SKIN_ALPHA } from '../src/game/SkinPresentation.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
function sprite(heroId = 'shana', frame = 12) {
  const atlas = HERO_ATLASES[heroId];
  return {
    active: true, x: 100, y: 200, depth: 25, originX: .5, originY: .5,
    width: atlas.frameWidth, height: atlas.frameHeight,
    scaleX: 78 / atlas.frameHeight, scaleY: 78 / atlas.frameHeight,
    rotation: 0, flipX: false, frame: { name: frame },
    get displayHeight() { return this.height * this.scaleY; },
  };
}

function sceneFor(heroId = 'shana', frame = 12) {
  const weapon = {
    width: 768, active: true,
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setFlipY(value) { this.flipY = value; return this; },
    setScale(value) { this.scale = value; return this; },
    destroy() { this.active = false; },
  };
  return {
    player: sprite(heroId, frame), facing: { x: 1, y: 0 },
    state: { hero: { id: heroId }, weapon: { id: 'revolver' }, skin: { id: 'shana-astral-warden' } },
    skinWeaponKey: 'chosen-weapon', add: { image() { return weapon; } },
  };
}

test('all four weaponless heroes have finite hand anchors on each of the 48 frame cells', () => {
  for (const heroId of Object.keys(HERO_ATLASES)) {
    const positions = new Set();
    for (let frame = 0; frame < 48; frame++) {
      const player = sprite(heroId, frame);
      const hand = weaponHandPosition(heroId, player);
      assert.ok(Number.isFinite(hand.x) && Number.isFinite(hand.y));
      assert.ok(Math.abs(hand.x - player.x) < player.width * player.scaleX / 2);
      assert.ok(Math.abs(hand.y - player.y) < player.height * player.scaleY / 2);
      positions.add(`${hand.x},${hand.y}`);
    }
    assert.ok(positions.size > 16, `${heroId} grip must follow authored frame poses`);
  }
});

test('key empty-fist landmarks use the edited pose rather than the removed baked gun', () => {
  for (const [heroId, frame, x, y] of [
    ['shana', 0, 127, 109], ['shana', 18, 132, 78],
    ['diamond', 18, 147, 82], ['scarlett', 24, 110, 90],
    ['hina', 12, 137, 101], ['hina', 24, 137, 112],
  ]) {
    const player = sprite(heroId, frame);
    player.x = 0; player.y = 0; player.scaleX = 1; player.scaleY = 1;
    player.originX = 0; player.originY = 0;
    const hand = weaponHandPosition(heroId, player);
    near(hand.x, x); near(hand.y, y);
  }
});

test('mirroring, size upgrades, sprite origin and recoil rotate the hand with the body', () => {
  for (const heroId of Object.keys(HERO_ATLASES)) for (let frame = 0; frame < 48; frame++) {
    const player = sprite(heroId, frame);
    const base = weaponHandPosition(heroId, player);
    player.flipX = true;
    const mirrored = weaponHandPosition(heroId, player);
    near(mirrored.x, 2 * player.x - base.x);
    near(mirrored.y, base.y);
    player.flipX = false;
    player.scaleX *= 1.5; player.scaleY *= 1.5;
    const larger = weaponHandPosition(heroId, player);
    near(larger.x - player.x, (base.x - player.x) * 1.5);
    near(larger.y - player.y, (base.y - player.y) * 1.5);
    player.scaleX /= 1.5; player.scaleY /= 1.5;
    player.rotation = Math.PI / 2;
    const rotated = weaponHandPosition(heroId, player);
    near(rotated.x - player.x, -(base.y - player.y));
    near(rotated.y - player.y, base.x - player.x);
    player.rotation = 0; player.originX = 0; player.originY = 0;
    const topLeft = weaponHandPosition(heroId, player);
    near(topLeft.x - base.x, player.width * player.scaleX / 2);
    near(topLeft.y - base.y, player.height * player.scaleY / 2);
    player.flipX = true; player.flipY = true;
    const topLeftMirrored = weaponHandPosition(heroId, player);
    near(topLeftMirrored.x - player.x, player.width * player.scaleX - (topLeft.x - player.x));
    near(topLeftMirrored.y - player.y, player.height * player.scaleY - (topLeft.y - player.y));
  }
});

test('every skin weapon has a rear-hand grip instead of a center-of-image pivot', () => {
  for (const skinId of Object.keys(PREMIUM_SKINS)) for (const weaponId of ['revolver', 'shotgun', 'crossbow', 'flame']) {
    const grip = weaponGrip(skinId, weaponId);
    assert.ok(grip.x > .1 && grip.x < .4);
    assert.ok(grip.y > .5 && grip.y < .75);
  }
  assert.deepEqual(weaponGrip('__proto__', 'unknown'), { x: .28, y: .6 });
});

test('the grip stays attached during aim changes without floating, breathing or body mutation', () => {
  const scene = sceneFor();
  const playerBefore = { ...scene.player };
  const presentation = applyWeaponSkin(scene);
  const { weapon } = presentation;
  const grip = weaponGrip(scene.state.skin.id, scene.state.weapon.id);
  near(weapon.originX, grip.x); near(weapon.originY, grip.y);
  const hand = weaponHandPosition(scene.state.hero.id, scene.player);
  const scale = weapon.scale;
  for (const angle of [0, .01, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2, -.37]) {
    scene.facing = { x: Math.cos(angle), y: Math.sin(angle) };
    syncWeaponSkin(presentation, scene.player, 100);
    near(weapon.x, hand.x); near(weapon.y, hand.y);
    near(weapon.rotation, angle); near(weapon.scale, scale);
    assert.equal(weapon.flipY, scene.facing.x < 0);
    near(weapon.originX, grip.x);
    near(weapon.originY, weapon.flipY ? 1 - grip.y : grip.y);
    // Local pixel transform of the authored grip must be zero even after flip.
    near((weapon.flipY ? 1 - grip.y : grip.y) - weapon.originY, 0);
    assert.equal(weapon.depth, scene.player.depth + (scene.facing.y < -.2 ? -1 : 1));
  }
  assert.deepEqual({ ...scene.player }, playerBefore);
  scene.player.frame.name = 14;
  syncWeaponSkin(presentation, scene.player);
  assert.notDeepEqual({ x: weapon.x, y: weapon.y }, hand);
  scene.player.scaleX *= 1.5; scene.player.scaleY *= 1.5;
  syncWeaponSkin(presentation, scene.player);
  near(weapon.scale, scale * 1.5);
});

test('presentation is skin-only and retains explicit damage visibility and cleanup', () => {
  const scene = sceneFor();
  const presentation = applyWeaponSkin(scene);
  setWeaponSkinVisibility(presentation, .28);
  near(presentation.weapon.alpha, WEAPON_SKIN_ALPHA * .28);
  syncWeaponSkin(presentation, scene.player);
  near(presentation.weapon.alpha, WEAPON_SKIN_ALPHA * .28);
  setWeaponSkinVisibility(presentation, 4);
  near(presentation.weapon.alpha, WEAPON_SKIN_ALPHA);
  destroyWeaponSkin(presentation);
  assert.equal(presentation.weapon.active, false);
  scene.state.skin = null;
  assert.equal(applyWeaponSkin(scene), null);
});
