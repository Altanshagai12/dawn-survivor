import assert from 'node:assert/strict';
import test from 'node:test';
import { CombatSystem } from '../src/game/CombatSystem.js';
import {
  launchSegmentHit, resolveProjectileLaunchHits, resolveProjectileTravelHits,
} from '../src/game/ProjectileLaunchCollision.js';

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
    x: 9,
    y: -7,
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
  assert.equal(enemy.knockbackVelocity, knockback);
  assert.equal(enemy.knockbackUntil, 1115);
  assert.equal(bullet.active, true);
  assert.equal(bullet.pierce, 0);
});

test('reaper rounds continue through a killed enemy', () => {
  const scene = makeScene();
  scene.state.flags.pierceKilled = true;
  const combat = new CombatSystem(scene);
  const enemy = makeEnemy();
  const bullet = {
    active: true, damage: 20, pierce: 0, knockback: 0, burnChance: 0,
    hitTargets: new Set(), destroy() { this.active = false; },
  };

  combat.hitEnemy(bullet, enemy);

  assert.equal(enemy.active, false);
  assert.equal(bullet.active, true);
  assert.equal(bullet.pierce, 0);
});

test('the launch segment catches point-blank targets before the muzzle position', () => {
  assert.equal(launchSegmentHit(0, 0, 26, 0, 10, 0, 12).hit, true);
  assert.equal(launchSegmentHit(0, 0, 26, 0, 10, 18, 12).hit, false);

  const scene = makeScene();
  const close = makeEnemy();
  close.x = 9;
  close.y = 0;
  close.enemyDef.radius = 10;
  const missed = makeEnemy();
  missed.spawnId = 8;
  missed.x = 8;
  missed.y = 30;
  missed.enemyDef.radius = 10;
  scene.enemies.getChildren = () => [close, missed];
  const combat = new CombatSystem(scene);
  const hits = [];
  combat.hitEnemy = (_bullet, enemy) => hits.push(enemy);

  resolveProjectileLaunchHits(combat, { active: true, collisionRadius: 4 }, 0, 0, 26, 0);

  assert.deepEqual(hits, [close]);
});

test('a fast crossbow travel segment cannot tunnel over an enemy between frames', () => {
  const scene = makeScene();
  const enemy = makeEnemy();
  enemy.x = 25;
  enemy.y = 0;
  enemy.enemyDef.radius = 10;
  scene.enemies.getChildren = () => [enemy];
  const combat = new CombatSystem(scene);
  const hits = [];
  combat.hitEnemy = (_bullet, target) => hits.push(target);

  const bullet = { active: true, collisionRadius: 4, trajectoryRevision: 0 };
  resolveProjectileTravelHits(combat, bullet, 0, 0, 50, 0);

  assert.deepEqual(hits, [enemy]);
});

test('a ricochet stops resolving candidates from the projectile previous trajectory', () => {
  const scene = makeScene();
  const first = makeEnemy();
  first.x = 15;
  first.y = 0;
  const second = makeEnemy();
  second.spawnId = 8;
  second.x = 35;
  second.y = 0;
  scene.enemies.getChildren = () => [first, second];
  const combat = new CombatSystem(scene);
  const hits = [];
  combat.hitEnemy = (bullet, target) => {
    hits.push(target);
    bullet.trajectoryRevision += 1;
  };

  resolveProjectileTravelHits(combat, {
    active: true, collisionRadius: 4, trajectoryRevision: 0,
  }, 0, 0, 50, 0);

  assert.deepEqual(hits, [first]);
});

test('a lethal projectile routes a Boomer through its explosion lifecycle', () => {
  const scene = makeScene();
  const combat = new CombatSystem(scene);
  const boomer = makeEnemy();
  boomer.enemyDef.id = 'boomer';
  let exploded = null;
  scene.enemySystem = {
    explodeBoomer(enemy) {
      exploded = enemy;
      enemy.active = false;
    },
  };

  combat.damageEnemy(boomer, boomer.hp, { bullet: {} });

  assert.equal(exploded, boomer);
  assert.equal(scene.state.kills, 0, 'the explosion owns the eventual kill accounting');
});
