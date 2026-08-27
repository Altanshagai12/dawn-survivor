import assert from 'node:assert/strict';
import test from 'node:test';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';
import { BossBarrierSystem } from '../src/game/BossBarrierSystem.js';
import { DAMAGE_SOURCE } from '../src/game/EnemySystem.js';

test('Shub barrier fills the view, damages once, and bounces the player inward', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = {
    BlendModes: { ADD: 1 },
    Math: {
      Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      Linear: (a, b, t) => a + (b - a) * t,
    },
  };
  let damageSource;
  let damage = 0;
  const graphics = {
    setDepth() { return this; }, setBlendMode() { return this; }, clear() { return this; },
    lineStyle() { return this; }, strokeRect() { return this; },
  };
  const scene = {
    add: { graphics: () => graphics },
    cameras: { main: { width: 1200, height: 700, zoom: 1 } },
    state: { elapsed: 300, hero: { size: 42 } },
    time: { now: 0 },
    player: {
      x: 1000, y: 0,
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setVelocity(x, y) { this.velocity = { x, y }; return this; },
    },
    enemySystem: { damagePlayer(amount, source) { damage += amount; damageSource = source; } },
  };
  try {
    const barrier = new BossBarrierSystem(scene);
    barrier.activate(0, 0);
    assert.equal(barrier.bounds().width, 1200 * TEN_MINUTES_BALANCE.barrier.startViewportWidthRatio);
    assert.equal(barrier.bounds().height, 700 * TEN_MINUTES_BALANCE.barrier.startViewportHeightRatio);
    scene.state.elapsed += 60;
    assert.equal(barrier.bounds().width, 1200 * TEN_MINUTES_BALANCE.barrier.endViewportWidthRatio);
    barrier.update();
    assert.ok(scene.player.x < barrier.bounds().right);
    assert.ok(scene.player.velocity.x < 0);
    assert.equal(damage, 1);
    assert.equal(damageSource, DAMAGE_SOURCE.BARRIER);
    scene.player.x = 1000;
    scene.time.now = 100;
    barrier.update();
    assert.equal(damage, 1, 'one contact cannot drain multiple hearts');
    scene.player.x = 0;
    scene.time.now = 300;
    barrier.update();
    scene.player.x = 1000;
    barrier.update();
    assert.equal(damage, 2, 'leaving and touching again starts a new contact');
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});
