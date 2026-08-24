import assert from 'node:assert/strict';
import test from 'node:test';
import { CombatSystem } from '../src/game/CombatSystem.js';

function makeScene() {
  return {
    physics: { add: { overlap() {} } },
    bullets: {},
    enemies: { getChildren: () => [] },
    time: { now: 1000 },
    state: {
      kills: 0,
      bosses: 0,
      burnKills: 0,
      mods: {},
      flags: {},
      hero: { id: 'shana', passive: 'halo' },
      weapon: { damage: 20 },
      multiplierStats: {
        burnDamage: 1,
        lightningDamage: 1,
        explosionDamage: 1,
        explosionRadius: 1,
      },
    },
    loot: { dropGem() {}, dropChest() {} },
    flashEffect() {},
    nearestEnemy: () => null,
    runScore: 0,
  };
}

function makeEnemy() {
  return {
    active: true,
    dying: false,
    spawnId: 7,
    x: 120,
    y: 80,
    hp: 10,
    maxHp: 10,
    body: { velocity: { add() {} } },
    status: { burnUntil: 0, freezeUntil: 0 },
    enemyDef: { id: 'creeper', boss: false, xp: 1, score: 10 },
    destroy() {
      this.active = false;
      this.body = null;
    },
  };
}

test('a lethal projectile hit does not access the enemy after it is destroyed', () => {
  const scene = makeScene();
  const combat = new CombatSystem(scene);
  const enemy = makeEnemy();
  const bullet = {
    active: true,
    damage: 20,
    pierce: 0,
    knockback: 10,
    burnChance: 0,
    hitTargets: new Set(),
    body: {
      velocity: {
        clone() {
          throw new Error('knockback must not read a destroyed enemy');
        },
      },
    },
    destroy() {
      this.active = false;
    },
  };

  assert.doesNotThrow(() => combat.hitEnemy(bullet, enemy));
  assert.equal(enemy.active, false);
  assert.equal(bullet.active, false);
  assert.equal(scene.state.kills, 1);
  assert.equal(scene.runScore, 10);
});

test('a surviving enemy receives knockback and a piercing bullet remains active', () => {
  const scene = makeScene();
  const combat = new CombatSystem(scene);
  const enemy = makeEnemy();
  enemy.hp = 100;
  enemy.maxHp = 100;
  let appliedKnockback = null;
  enemy.body.velocity.add = (velocity) => { appliedKnockback = velocity; };
  const knockback = {
    normalize() { return this; },
    scale(amount) { this.amount = amount; return this; },
  };
  const bullet = {
    active: true,
    damage: 20,
    pierce: 1,
    knockback: 12,
    burnChance: 0,
    hitTargets: new Set(),
    body: { velocity: { clone: () => knockback } },
    destroy() { this.active = false; },
  };

  combat.hitEnemy(bullet, enemy);

  assert.equal(enemy.hp, 80);
  assert.equal(enemy.active, true);
  assert.equal(appliedKnockback, knockback);
  assert.equal(appliedKnockback.amount, 12);
  assert.equal(bullet.active, true);
  assert.equal(bullet.pierce, 0);
});
