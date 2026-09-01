import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAMAGE_SOURCE, EnemySystem, PLAYER_INVULNERABILITY_BLINK_MS, PLAYER_INVULNERABILITY_MS,
} from '../src/game/EnemySystem.js';

function makeAlphaNode(alpha) {
  return { alpha, setAlpha(value) { this.alpha = value; return this; } };
}

function makeScene() {
  let damageCalls = 0;
  let premiumVisibility = 1;
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
    get premiumVisibility() { return premiumVisibility; },
    physics: { add: { overlap() {} } },
    player,
    enemies: {},
    enemyBullets: {},
    ended: false,
    skinAura: {
      silhouette: makeAlphaNode(.18), backSigil: makeAlphaNode(.22), crest: makeAlphaNode(.16),
      orbitals: [makeAlphaNode(.75), makeAlphaNode(.75), makeAlphaNode(.75)],
      weapon: makeAlphaNode(.62),
    },
    premiumVfx: { setPlayerVisibility(value) { premiumVisibility = value; } },
    lastInput: { moveX: 0, moveY: 0 },
    state: {
      flags: {},
      isInvincible: false,
      takeDamage() { damageCalls += 1; return { blocked: false, dead: false }; },
    },
    time: { now: 1000, delayedCall() {} },
    tweens: { add() { return { stop() {} }; } },
    cameras: { main: { shake() {} } },
    combat: { explode() {} },
    ui: { toast() {} },
    endRun() {},
  };
}

test('one hit grants synchronized i-frames that block every stacked damage source', () => {
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { TintModes: { FILL: 1 } };
  try {
    const scene = makeScene();
    const system = new EnemySystem(scene);

    assert.equal(system.damagePlayer(1, DAMAGE_SOURCE.PROJECTILE), true);
    assert.equal(system.playerInvulnerableUntil, 1000 + PLAYER_INVULNERABILITY_MS);
    assert.equal(system.lastDamageSource, DAMAGE_SOURCE.PROJECTILE);
    assert.equal(scene.damageCalls, 1);
    assert.equal(scene.state.isInvincible, true);
    assert.equal(scene.player.alpha, .28);
    assert.equal(scene.premiumVisibility, .28);
    assert.ok(Math.abs(scene.skinAura.silhouette.alpha - .18 * .28) < 1e-10);
    assert.ok(Math.abs(scene.skinAura.backSigil.alpha - .22 * .28) < 1e-10);
    assert.ok(Math.abs(scene.skinAura.crest.alpha - .16 * .28) < 1e-10);
    assert.ok(scene.skinAura.orbitals.every(({ alpha }) => Math.abs(alpha - .75 * .28) < 1e-10));
    assert.ok(Math.abs(scene.skinAura.weapon.alpha - .62 * .28) < 1e-10);

    assert.equal(system.damagePlayer(1, DAMAGE_SOURCE.ENEMY), false);
    assert.equal(system.damagePlayer(1, DAMAGE_SOURCE.BARRIER), false);
    assert.equal(scene.damageCalls, 1);

    scene.time.now += PLAYER_INVULNERABILITY_BLINK_MS;
    system.updatePlayerInvulnerability();
    assert.equal(scene.state.isInvincible, true);
    assert.equal(scene.player.alpha, 1);
    assert.equal(scene.skinAura.silhouette.alpha, .18);
    assert.equal(scene.skinAura.backSigil.alpha, .22);
    assert.equal(scene.skinAura.crest.alpha, .16);
    assert.ok(scene.skinAura.orbitals.every(({ alpha }) => alpha === .75));
    assert.equal(scene.skinAura.weapon.alpha, .62);

    scene.time.now += PLAYER_INVULNERABILITY_MS - PLAYER_INVULNERABILITY_BLINK_MS - 1;
    assert.equal(system.damagePlayer(1), false);
    assert.equal(scene.damageCalls, 1);

    scene.time.now += 1;
    assert.equal(system.damagePlayer(1), true);
    assert.equal(scene.damageCalls, 2);

    scene.time.now += PLAYER_INVULNERABILITY_MS;
    system.updatePlayerInvulnerability();
    assert.equal(scene.state.isInvincible, false);
    assert.equal(scene.player.alpha, 1);
    assert.equal(scene.premiumVisibility, 1);
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

test('a Boomer explosion kills nearby regular enemies but spares bosses and distant troops', () => {
  const source = { active: true, x: 0, y: 0, enemyDef: { id: 'boomer' } };
  const nearby = { active: true, x: 80, y: 0, enemyDef: { id: 'tentacle' } };
  const distant = { active: true, x: 140, y: 0, enemyDef: { id: 'tentacle' } };
  const boss = { active: true, x: 40, y: 0, enemyDef: { id: 'elder', boss: true } };
  const killed = [];
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Distance: { Between: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) } } };
  try {
    const system = {
      scene: {
        player: { x: 500, y: 500 },
        enemies: { getChildren: () => [source, nearby, distant, boss] },
        combat: { killEnemy(enemy, detail) { killed.push({ enemy, detail }); } },
        flashEffect() {},
      },
      damagePlayer() { throw new Error('player is outside the blast'); },
    };
    EnemySystem.prototype.explodeBoomer.call(system, source);
    assert.deepEqual(killed.map(({ enemy }) => enemy), [nearby, source]);
    assert.equal(killed[0].detail.friendlyFire, true);
    assert.equal(killed[1].detail.boomerExplosion, true);
    assert.equal(killed.some(({ enemy }) => enemy === distant || enemy === boss), false);
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
