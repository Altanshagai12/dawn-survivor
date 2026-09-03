import assert from 'node:assert/strict';
import test from 'node:test';
import { projectileTravelDistance, WEAPONS } from '../src/data/weapons.js';
import { UPGRADES } from '../src/data/upgrades.js';
import {
  CombatSystem, PROJECTILE_RENDER_MULTIPLIER, projectileBodyGeometry, projectileBodyRadius,
  projectileCollisionRadius, projectileScale, syncProjectileVisualRotation, usesSweptProjectileCollision,
  visibleProjectileCollisionRadius,
} from '../src/game/CombatSystem.js';
import { premiumProjectileScale } from '../src/game/PremiumVfxDirector.js';
import { shouldConsumeAmmo, upgradedProjectileCount } from '../src/game/WeaponMechanics.js';
import { nextWeaponCharge } from '../src/game/PlayerFeedback.js';
import { RunState } from '../src/game/RunState.js';
import { HEROES } from '../src/data/heroes.js';

test('ships the four core ten-minute weapon profiles', () => {
  assert.deepEqual(Object.keys(WEAPONS), ['revolver', 'shotgun', 'crossbow', 'flame']);
  assert.deepEqual(
    Object.fromEntries(Object.entries(WEAPONS).map(([id, weapon]) => [id, [weapon.damage, weapon.fireRate, weapon.projectiles, weapon.magazine, weapon.reload]])),
    {
      revolver: [14, 4, 1, 6, 1],
      shotgun: [12, 5, 4, 2, 1],
      crossbow: [20, 4, 1, 1, 1],
      flame: [3, 2.5, 1, 12, 1.4],
    },
  );
});

test('weapons preserve their authored near-to-far projectile travel roles', () => {
  const ranges = Object.fromEntries(Object.entries(WEAPONS)
    .map(([id, weapon]) => [id, projectileTravelDistance(weapon)]));
  assert.deepEqual(ranges, { revolver: 864, shotgun: 280, crossbow: 1350, flame: 241.8 });
  assert.ok(ranges.crossbow > ranges.revolver);
  assert.ok(ranges.revolver > ranges.shotgun);
  assert.ok(ranges.shotgun > ranges.flame);
  assert.equal(projectileTravelDistance(WEAPONS.shotgun, 1.15), 322);
});

test('Big Shot enlarges both projectile rendering and its collision footprint', () => {
  const bigShotSize = WEAPONS.revolver.bulletSize * 1.4;
  assert.ok(Math.abs(projectileScale(bigShotSize) - 2.66) < 1e-9);
  assert.ok(Math.abs(projectileCollisionRadius(bigShotSize) - 5.6) < 1e-9);
});

test('projectile physics ignores skin art size, origin and cosmetic power multipliers', () => {
  assert.equal(PROJECTILE_RENDER_MULTIPLIER, 1.9);
  assert.equal(projectileScale(WEAPONS.revolver.bulletSize), 1.9);
  assert.equal(projectileCollisionRadius(WEAPONS.revolver.bulletSize), 4);
  for (const weapon of Object.values(WEAPONS)) for (const multiplier of [.45, 1, 1.4, 2.8]) {
    const size = weapon.bulletSize * multiplier;
    const scale = premiumProjectileScale(size, weapon.id);
    assert.equal(visibleProjectileCollisionRadius(size, scale, 256, 256, .3), size / 2);
    assert.equal(projectileBodyGeometry({ size, renderScale: scale * 10, frameWidth: 256,
      frameHeight: 256, originX: .3, originY: .7, visualCoreRatio: 1 }).worldRadius, size / 2);
  }
});

test('a premium atlas scale preserves the authored world collision radius', () => {
  const premiumScale = .085;
  const localBodyRadius = projectileBodyRadius(9, premiumScale);
  assert.ok(Math.abs(localBodyRadius * premiumScale - projectileCollisionRadius(9)) < 1e-9);
});

test('projectile body is centered on its visible anchor at every render scale', () => {
  const body = projectileBodyGeometry({
    size: 8, renderScale: .4, frameWidth: 256, frameHeight: 256,
    originX: .6, originY: .45,
  });
  assert.equal((body.offsetX + body.localRadius) * .4, 256 * .6 * .4);
  assert.equal((body.offsetY + body.localRadius) * .4, 256 * .45 * .4);
  assert.equal(body.worldRadius, 4);
});

test('every authored weapon projectile uses swept collision on slow frames', () => {
  for (const weapon of Object.values(WEAPONS)) assert.equal(usesSweptProjectileCollision(weapon.id), true);
  assert.equal(usesSweptProjectileCollision(null), false);
});

test('cosmetic projectile rotation does not alter its authored trajectory', () => {
  const bullet = {
    rotation: 0, visualRotationOffset: .42,
    setRotation(value) { this.rotation = value; return this; },
  };
  assert.ok(Math.abs(syncProjectileVisualRotation(bullet, -.2) - .22) < 1e-9);
  assert.equal(bullet.trajectoryAngle, -.2);
});

test('crossbow charge grows while still and resets on movement', () => {
  assert.equal(nextWeaponCharge(0, WEAPONS.crossbow, 1.25, false), .5);
  assert.equal(nextWeaponCharge(.75, WEAPONS.crossbow, 2, false), 1);
  assert.equal(nextWeaponCharge(1, WEAPONS.crossbow, .1, true), 0);
  assert.equal(nextWeaponCharge(.8, WEAPONS.revolver, 1, false), 0);
});

test('projectile upgrades wire ricochet, rear fire, fan fire, and fusillade', () => {
  const byName = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.name, upgrade]));
  assert.equal(byName['Rubber Bullets'].mods.bounceAdd, 1);
  assert.equal(byName['Split Fire'].set.backShot, true);
  assert.equal(byName['Fan Fire'].set.fanFire, true);
  assert.equal(byName.Fusillade.set.fusillade, true);
  assert.equal(upgradedProjectileCount(4, 2, true), 10);
});

test('siege preserves ammo only while standing still', () => {
  assert.equal(shouldConsumeAmmo({ siege: true, moving: false, roll: .32 }), false);
  assert.equal(shouldConsumeAmmo({ siege: true, moving: false, roll: .33 }), true);
  assert.equal(shouldConsumeAmmo({ siege: true, moving: true, roll: 0 }), true);
  assert.equal(shouldConsumeAmmo({ free: true }), false);
});

test('a final upgraded shot fires forward, backward, and around the player', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { DegToRad: (degrees) => degrees * Math.PI / 180 } };
  try {
    const state = new RunState(HEROES.shana, WEAPONS.crossbow);
    state.mods.projectilesAdd = 2;
    Object.assign(state.flags, { fusillade: true, backShot: true, fanFire: true });
    const spawned = [];
    const scene = {
      physics: { add: { overlap() {} } }, bullets: {}, enemies: { getChildren: () => [] },
      state, player: { x: 0, y: 0 }, time: { now: 1000 },
      onShot() {}, flashEffect() {}, nearestEnemy: () => null,
    };
    const combat = new CombatSystem(scene);
    combat.spawnBullet = (x, y, angle, spec) => { spawned.push({ x, y, angle, spec }); return {}; };

    combat.fire(1, 0);

    assert.equal(spawned.length, 15);
    assert.ok(spawned.some(({ angle }) => Math.abs(angle - Math.PI) < .001));
    assert.equal(state.reloading, true);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});

test('Scarlett counts fire events and emits exactly two waves across six shots', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { DegToRad: (degrees) => degrees * Math.PI / 180, FloatBetween: () => 0 } };
  try {
    const state = new RunState(HEROES.scarlett, WEAPONS.revolver);
    const scene = {
      physics: { add: { overlap() {} } }, bullets: {}, enemies: { getChildren: () => [] },
      state, player: { x: 0, y: 0 }, time: { now: 1000 }, lastInput: { moveX: 0, moveY: 0 },
      onShot() {}, flashEffect() {}, nearestEnemy: () => null,
    };
    const combat = new CombatSystem(scene);
    combat.spawnBullet = () => ({});
    let waves = 0;
    combat.fireWave = () => { waves += 1; };
    for (let index = 0; index < 6; index += 1) combat.fire(1, 0);
    assert.equal(waves, 2);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});
