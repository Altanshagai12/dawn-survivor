import assert from 'node:assert/strict';
import test from 'node:test';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';
import { BossBarrierSystem } from '../src/game/BossBarrierSystem.js';
import { DAMAGE_SOURCE } from '../src/game/EnemySystem.js';

test('Shub barrier starts large, shrinks for 60 seconds, and blocks escape', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = {
    BlendModes: { ADD: 1 },
    Math: {
      Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      Linear: (a, b, t) => a + (b - a) * t,
    },
  };
  let damageSource;
  const graphics = {
    setDepth() { return this; }, setBlendMode() { return this; }, clear() { return this; },
    lineStyle() { return this; }, strokeRect() { return this; },
  };
  const scene = {
    add: { graphics: () => graphics },
    state: { elapsed: 300, hero: { size: 42 } },
    time: { now: 0 },
    player: {
      x: 1000, y: 0,
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setVelocity() { return this; },
    },
    enemySystem: { damagePlayer(_amount, source) { damageSource = source; } },
  };
  try {
    const barrier = new BossBarrierSystem(scene);
    barrier.activate(0, 0);
    assert.equal(barrier.bounds().width, TEN_MINUTES_BALANCE.barrier.startWidth);
    scene.state.elapsed += 60;
    assert.equal(barrier.bounds().width, TEN_MINUTES_BALANCE.barrier.endWidth);
    barrier.update();
    assert.ok(scene.player.x < TEN_MINUTES_BALANCE.barrier.endWidth / 2);
    assert.equal(damageSource, DAMAGE_SOURCE.BARRIER);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});
