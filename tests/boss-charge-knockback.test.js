import assert from 'node:assert/strict';
import test from 'node:test';
import { CombatSystem } from '../src/game/CombatSystem.js';
import { EnemySystem } from '../src/game/EnemySystem.js';
import { TEN_MINUTES_BALANCE } from '../src/config/balance.js';

function hit({ id = 'shub', chargeUntil = 0, chargePending = false } = {}) {
  const enemy = {
    active: true, spawnId: 1, x: 0, y: 0, hp: 100, maxHp: 100,
    enemyDef: { id, boss: true }, chargeUntil, chargePending,
    chargeVector: { x: 1, y: 0 }, speed: 80,
    body: { velocity: { x: 0, y: 0, add(v) { this.x += v.x; this.y += v.y; } } },
    setVelocity(x, y) { Object.assign(this.body.velocity, { x, y }); },
    play() {},
  };
  const bullet = {
    active: true, damage: 20, knockback: 100, hitTargets: new Set(),
    body: { velocity: { clone: () => ({
      x: -1, y: 0, normalize() { return this; },
      scale(n) { this.x *= n; this.y *= n; return this; },
    }) } },
  };
  const scene = {
    time: { now: 1000 }, state: { mods: {}, flags: {}, hero: { speed: 180 } },
    flashEffect() {},
  };
  CombatSystem.prototype.hitEnemy.call({
    scene,
    damageEnemy(target, amount) { target.hp -= amount; },
    finishBulletHit() {},
  }, bullet, enemy);
  return { enemy, scene };
}

test('only an active second-boss charge reduces projectile knockback to 10%, without reducing damage', () => {
  for (const [phase, input, expected] of [
    ['chase', {}, -100],
    ['windup', { chargePending: true }, -100],
    ['charging', { chargeUntil: 1700 }, -10],
    ['charge boundary', { chargeUntil: 1000 }, -100],
    ['recovery', { chargeUntil: 999 }, -100],
    ['first boss', { id: 'elder', chargeUntil: 1700 }, -100],
  ]) {
    const { enemy } = hit(input);
    assert.equal(enemy.body.velocity.x, expected, phase);
    assert.equal(enemy.knockbackVelocity.x, expected, phase);
    assert.equal(enemy.knockbackUntil, 1155, 'impact duration is preserved');
    assert.equal(enemy.hp, 80, 'charge resistance does not change projectile damage');
  }
});

test('enemy update preserves forward charge through hits and restores normal knockback after the attack', () => {
  const { enemy, scene } = hit({ chargeUntil: 1100 });
  Object.assign(scene, {
    player: { x: 300, y: 0 }, performance: { mobile: true },
    enemies: { getChildren: () => [enemy] }, enemyBullets: { getChildren: () => [] },
  });
  enemy.status = { freezeUntil: 0 };
  const system = Object.assign(Object.create(EnemySystem.prototype), {
    scene, steeringAt: Infinity,
    updatePlayerInvulnerability() {}, updateStatuses() {},
  });
  const chargeSpeed = 180 * TEN_MINUTES_BALANCE.enemy.shub.chargeRatio;
  system.update();
  assert.equal(enemy.body.velocity.x, chargeSpeed - 10,
    'a weak impulse must be blended with the charge, not replace it and stop the boss');
  scene.time.now = 1016;
  system.update();
  assert.equal(enemy.body.velocity.x, chargeSpeed - 10, 'impulses must not accumulate per frame');
  scene.time.now = 1100;
  system.update();
  assert.equal(enemy.body.velocity.x, -10, 'the ended attack no longer drives charge movement');

  const afterAttack = hit({ chargeUntil: 999 });
  scene.enemies.getChildren = () => [afterAttack.enemy];
  afterAttack.enemy.status = { freezeUntil: 0 };
  system.update();
  assert.equal(afterAttack.enemy.body.velocity.x, -100,
    'new post-charge impacts retain their original full knockback');
});
