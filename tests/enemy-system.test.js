import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAMAGE_SOURCE, EnemySystem, PLAYER_INVULNERABILITY_MS,
} from '../src/game/EnemySystem.js';

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

    assert.equal(system.damagePlayer(1, DAMAGE_SOURCE.PROJECTILE), true);
    assert.equal(system.playerInvulnerableUntil, 1000 + PLAYER_INVULNERABILITY_MS);
    assert.equal(system.lastDamageSource, DAMAGE_SOURCE.PROJECTILE);
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

test('a Boomer arms on contact and only damages when its windup explodes', () => {
  let damageCalls = 0;
  let kills = 0;
  let armed = 0;
  const enemy = {
    active: true, x: 0, y: 0,
    enemyDef: { id: 'boomer', damage: 1 },
    nextContactAt: 0,
    setVelocity() {},
  };
  const system = {
    scene: {
      time: { now: 1000 },
      player: { x: 0, y: 0 },
      flashEffect() {},
      combat: { killEnemy() { kills += 1; } },
    },
    armBoomer() { armed += 1; enemy.boomerExplodesAt = 1700; },
    damagePlayer(amount, source) {
      damageCalls += amount;
      assert.equal(source, DAMAGE_SOURCE.BOOMER);
      return true;
    },
  };
  EnemySystem.prototype.touchPlayer.call(system, enemy);
  assert.equal(damageCalls, 0);
  assert.equal(kills, 0);
  assert.equal(armed, 1);
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Distance: { Between: () => 0 } } };
  try {
    EnemySystem.prototype.explodeBoomer.call(system, enemy);
    assert.equal(damageCalls, 1);
    assert.equal(kills, 1);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
});

test('burn damage keeps a visible flame pulse on the affected enemy', () => {
  let damage = 0;
  const flashes = [];
  const enemy = {
    active: true, x: 80, y: 120, displayHeight: 50,
    enemyDef: { boss: false },
    status: { burnUntil: 5000, burnTick: 0, burnDamage: 1.5, freezeUntil: 0 },
    setTint(value) { this.tint = value; },
    clearTint() {},
  };
  const system = {
    scene: {
      time: { now: 1000 },
      combat: { damageEnemy(_enemy, amount) { damage += amount; } },
      flashEffect(x, y, row, scale) { flashes.push({ x, y, row, scale }); },
    },
  };
  EnemySystem.prototype.updateStatuses.call(system, enemy, 1000);
  assert.equal(damage, 1.5);
  assert.equal(enemy.tint, 0xff7a38);
  assert.deepEqual(flashes, [{ x: 80, y: 116, row: 2, scale: .2 }]);
  assert.equal(enemy.status.burnTick, 1500);
});
