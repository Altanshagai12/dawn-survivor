import assert from 'node:assert/strict';
import test from 'node:test';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';
import { HERO_ATLASES } from '../src/config/assets.js';
import { HEROES } from '../src/data/heroes.js';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { WEAPONS } from '../src/data/weapons.js';
import { RunState } from '../src/game/RunState.js';
import {
  CharacterAbilitySystem, dashCooldownState, movementDashDirection,
} from '../src/game/CharacterAbilitySystem.js';

function cloneSprite(x, y) {
  return {
    active: true, x, y,
    setDepth() { return this; }, setScale() { return this; }, setAlpha() { return this; },
    setTint() { return this; }, setRotation() { return this; }, destroy() { this.active = false; },
  };
}

test('Hina dashes toward movement, independent of aim, and leaves a stationary clone', () => {
  const clones = [];
  const scene = {
    time: { now: 1000 },
    state: { hero: { id: 'hina' } },
    player: { x: 20, y: 30, scaleX: .5, setVelocity(x, y) { this.velocity = { x, y }; } },
    add: { sprite(x, y) { const clone = cloneSprite(x, y); clones.push(clone); return clone; } },
    nearestEnemy: () => null,
    flashEffect() {},
  };
  const system = new CharacterAbilitySystem(scene);
  assert.equal(system.update({ ability: true, moveX: -1, moveY: 0, aimX: 1, aimY: 0 }), true);
  assert.equal(clones.length, 1);
  assert.deepEqual([clones[0].x, clones[0].y], [20, 30]);
  assert.equal(clones[0].expiresAt, 1000 + TEN_MINUTES_BALANCE.player.hina.cloneDuration * 1000);
  assert.equal(scene.player.velocity.x,
    -TEN_MINUTES_BALANCE.player.hina.dashDistance / TEN_MINUTES_BALANCE.player.hina.dashDuration);
  scene.player.x = 200;
  scene.time.now = 1200;
  system.update({ ability: false, moveX: -1, moveY: 0, aimX: 1, aimY: 0 });
  assert.deepEqual([clones[0].x, clones[0].y], [20, 30]);
});

test('dash keeps the last movement-stick direction when the stick returns to center', () => {
  assert.deepEqual(
    movementDashDirection({ moveX: 0, moveY: 0, aimX: 1, aimY: 0 }, { x: 0, y: -1 }),
    { x: 0, y: -1 },
  );
});

test('Hina dash recharges on the original two-second cadence and not before', () => {
  const clones = [];
  const scene = {
    time: { now: 1000 },
    state: { hero: { id: 'hina' } },
    player: { x: 20, y: 30, scaleX: .5, setVelocity() {} },
    add: { sprite(x, y) { const clone = cloneSprite(x, y); clones.push(clone); return clone; } },
    nearestEnemy: () => null,
    flashEffect() {},
  };
  const system = new CharacterAbilitySystem(scene);
  system.update({ ability: true, moveX: 1, moveY: 0 });
  assert.equal(system.nextDashAt, 3000);
  assert.equal(clones.length, 1);

  scene.time.now = 2999;
  system.update({ ability: true, moveX: 1, moveY: 0 });
  assert.equal(clones.length, 1);
  assert.deepEqual(system.getDashCooldownState(), {
    ready: false,
    remainingMs: 1,
    progress: 0.9995,
  });

  scene.time.now = 3000;
  system.update({ ability: true, moveX: 1, moveY: 0 });
  assert.equal(clones.length, 2);
  assert.equal(system.getDashCooldownState().progress, 0);
});

test('dash cooldown presentation starts ready and reaches half charge at one second', () => {
  assert.deepEqual(dashCooldownState(0, 0, 2), {
    ready: true,
    remainingMs: 0,
    progress: 1,
  });
  assert.deepEqual(dashCooldownState(2000, 3000, 2), {
    ready: false,
    remainingMs: 1000,
    progress: .5,
  });
});

test('a cross-hero weapon skin leaves Hina dash and clone visuals original', () => {
  const skin = PREMIUM_SKINS['shana-astral-warden'];
  const state = new RunState(HEROES.hina, WEAPONS.shotgun, skin);
  const bullets = [];
  const clones = [];
  const scene = {
    time: { now: 1000 }, state,
    player: { x: 20, y: 30, scaleX: .5, frame: { name: 24 }, setVelocity() {} },
    add: {
      sprite(x, y, key, frame) {
        const clone = cloneSprite(x, y);
        clone.texture = key;
        clone.frame = frame;
        clone.setTint = (tint) => { clone.tint = tint; return clone; };
        clones.push(clone);
        return clone;
      },
      image() { assert.fail('weapon cosmetics must not add a clone crest'); },
    },
    premiumVfx: { specialVolley() { assert.fail('dash/clone must not receive weapon VFX'); } },
    weaponAudio: { playVoice() { assert.fail('dash must not receive a cosmetic hero voice'); } },
    combat: { spawnBullet(x, y, angle, spec) { bullets.push(spec); } },
    nearestEnemy: () => ({ x: 50, y: 30 }),
    flashEffect() {},
  };
  const system = new CharacterAbilitySystem(scene);
  system.startDash({ moveX: -1, moveY: 0, aimX: 1, aimY: 0 });
  assert.equal(clones[0].texture, HERO_ATLASES.hina.key);
  assert.equal(clones[0].tint, 0xaa70ff);
  assert.equal(clones[0].frame, 24);
  assert.equal(system.nextDashAt, 3000);
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Angle: { Between: () => 0 } } };
  try {
    scene.time.now = 1120;
    system.updateClones(scene.time.now);
    assert.equal(bullets.length, 1);
    assert.equal(bullets[0].skin, skin, 'clone weapon fire retains the selected weapon skin');
    assert.equal(bullets[0].damage, WEAPONS.shotgun.damage);
    assert.equal(bullets[0].speed, WEAPONS.shotgun.projectileSpeed);
    assert.equal(bullets[0].life, WEAPONS.shotgun.projectileLife);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});
