import assert from 'node:assert/strict';
import test from 'node:test';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';
import { CharacterAbilitySystem, movementDashDirection } from '../src/game/CharacterAbilitySystem.js';

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
