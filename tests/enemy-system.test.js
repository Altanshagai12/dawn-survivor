import assert from 'node:assert/strict';
import test from 'node:test';
import { EnemySystem, PLAYER_INVULNERABILITY_MS } from '../src/game/EnemySystem.js';

function makeScene() {
  let damageCalls = 0;
  let tweenConfig = null;
  const player = {
    active: true,
    alpha: 1,
    x: 0,
    y: 0,
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTint() { return this; },
    setTintMode() { return this; },
    clearTint() { return this; },
  };
  return {
    get damageCalls() { return damageCalls; },
    get tweenConfig() { return tweenConfig; },
    physics: { add: { overlap() {} } },
    player,
    enemies: {},
    enemyBullets: {},
    ended: false,
    lastInput: { moveX: 0, moveY: 0 },
    state: {
      flags: {},
      takeDamage() { damageCalls += 1; return { blocked: false, dead: false }; },
    },
    time: { now: 1000, delayedCall() {} },
    tweens: {
      add(config) {
        tweenConfig = config;
        return { stop() {} };
      },
    },
    cameras: { main: { shake() {} } },
    combat: { explode() {} },
    ui: { toast() {} },
    endRun() {},
  };
}

test('damage grants a visible immunity window that blocks stacked hits', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { TintModes: { FILL: 1 } };
  try {
    const scene = makeScene();
    const system = new EnemySystem(scene);

    assert.equal(system.damagePlayer(1), true);
    assert.equal(system.playerInvulnerableUntil, 1000 + PLAYER_INVULNERABILITY_MS);
    assert.equal(scene.damageCalls, 1);
    assert.ok((scene.tweenConfig.repeat + 1) * scene.tweenConfig.duration * 2
      >= PLAYER_INVULNERABILITY_MS);

    scene.time.now += PLAYER_INVULNERABILITY_MS - 1;
    assert.equal(system.damagePlayer(1), false);
    assert.equal(scene.damageCalls, 1);

    scene.time.now += 1;
    assert.equal(system.damagePlayer(1), true);
    assert.equal(scene.damageCalls, 2);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});
