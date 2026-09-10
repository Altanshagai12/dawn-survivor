import assert from 'node:assert/strict';
import test from 'node:test';
import { BOSSES } from '../src/data/enemies.js';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';
import { Spawner } from '../src/game/Spawner.js';
import { CombatSystem } from '../src/game/CombatSystem.js';
import { EnemySystem } from '../src/game/EnemySystem.js';

function fixture() {
  const enemy = {
    active: true, x: 0, y: 0,
    groundShadow: { setActive() { return this; }, setVisible() { return this; } },
    data: { reset() {} }, body: { velocity: { add() {} }, setSize() {} },
    setScale(value) { this.scaleX = value; return this; },
    setDepth() { return this; }, setDataEnabled() { return this; }, play() {},
    setVelocity() { return this; }, setActive(value) { this.active = value; return this; },
    setVisible() { return this; }, setTint() {}, clearTint() {},
  };
  const scene = {
    state: { elapsed: 299.99, bosses: 0, kills: 0, mods: {}, flags: {},
      multiplierStats: { burnDamage: 1 } },
    time: { now: 300_000 }, player: { x: 0, y: 0 },
    obstacles: { isSpawnClear: () => true }, barrier: { activate() {}, deactivate() {} },
    ui: { toast() {} }, cameras: { main: { shake() {} } },
    physics: { add: { overlap() {} } }, loot: { dropBossReward() {} },
    flashEffect() {}, runScore: 0,
  };
  const spawner = new Spawner(scene);
  spawner.spawnedBosses.add('elder');
  spawner.spawnSessionWave = () => {};
  spawner.acquire = (_atlas, x, y) => Object.assign(enemy, { x, y });
  scene.spawner = spawner;
  scene.combat = new CombatSystem(scene);
  return { scene, spawner, enemy };
}

test('five-minute Shub keeps the pre-knockback-change stats and actually spawns with 2500 HP', () => {
  // Authored production baseline before the visual/charge patch: e9a618b.
  assert.deepEqual(BOSSES.shub, {
    id: 'shub', name: 'Shub-Niggurath', spawnAt: 300, hp: 2500,
    speed: 180 * .47, damage: 1, radius: 55, size: 140,
    score: 2500, pattern: 'shub', rewardType: 'tome',
  });
  assert.deepEqual(TEN_MINUTES_BALANCE.enemy.shub, {
    speedRatio: .47, chargeRatio: 2.6, telegraphMs: 900, chargeMs: 700,
  });
  const { scene, spawner, enemy } = fixture();
  spawner.update(0);
  assert.equal(scene.activeBoss, undefined);
  scene.state.elapsed = 300;
  spawner.update(0);
  assert.equal(scene.activeBoss, enemy);
  assert.equal(enemy.hp, 2500);
  assert.equal(enemy.maxHp, 2500);
  assert.equal(enemy.spawnTime, 300);
  assert.equal(enemy.speed, BOSSES.shub.speed);
  assert.equal(enemy.enemyDef.damage, 1);
  assert.equal(enemy.enemyDef.boss, true);
  enemy.hp = 2400;
  scene.state.elapsed = 301;
  spawner.update(1);
  assert.equal(enemy.hp, 2400, 'scheduler must not reset or respawn the active boss');
});

test('Shub still takes exactly 125 distinct 20-damage hits, regardless of charge phase', () => {
  for (const charging of [false, true]) {
    const { scene, spawner, enemy } = fixture();
    scene.state.elapsed = 300;
    spawner.update(0);
    enemy.chargeUntil = charging ? scene.time.now + 700 : 0;
    for (let count = 1; count <= 125; count += 1) {
      const bullet = { active: true, hitTargets: new Set(), damage: 20, pierce: 1,
        destroy() { this.active = false; } };
      scene.combat.hitEnemy(bullet, enemy);
      scene.combat.hitEnemy(bullet, enemy);
      assert.equal(enemy.hp, 2500 - count * 20, 'repeat overlap of one projectile must not double damage');
      assert.equal(enemy.active, count < 125);
    }
    assert.equal(scene.state.bosses, 1);
    assert.equal(scene.runScore, 2500);
  }
});

test('boss burn and frostbite retain baseline damage during a charge', () => {
  const { scene, spawner, enemy } = fixture();
  scene.state.elapsed = 300;
  spawner.update(0);
  enemy.chargeUntil = scene.time.now + 700;
  scene.combat.effects.applyBurn(enemy, 10);
  EnemySystem.prototype.updateStatuses.call({ scene }, enemy, scene.time.now);
  assert.equal(enemy.hp, 2495, '10 DPS burn delivers the original 5-damage half-second tick');
  EnemySystem.prototype.updateStatuses.call({ scene }, enemy, scene.time.now + 100);
  assert.equal(enemy.hp, 2495, 'render/update frames must not duplicate a burn tick');
  scene.state.flags.frostbite = true;
  scene.combat.effects.applyFreeze(enemy);
  assert.equal(enemy.hp, 2470, 'boss frostbite stays at 1% of max HP (25)');
  assert.equal(enemy.status.freezeUntil, scene.time.now + 300);
  scene.combat.effects.applyFreeze(enemy);
  assert.equal(enemy.hp, 2470, 'an already-frozen boss must not take frostbite again');
});
