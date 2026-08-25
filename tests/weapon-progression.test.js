import assert from 'node:assert/strict';
import test from 'node:test';
import { WEAPONS } from '../src/data/weapons.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { CombatSystem } from '../src/game/CombatSystem.js';
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
