import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TREE_ATTACKS, TREE_CONTACT_DAMAGE, TREE_CONTACT_RELEASE_DISTANCE, TREE_IDLE_FRAME, TREE_ROOT_ORIGIN,
  WorldObstacleSystem, chunkTreePoints,
} from '../src/game/WorldObstacleSystem.js';
import { DAMAGE_SOURCE } from '../src/game/EnemySystem.js';

test('mysterious trees have deterministic sparse world placement', () => {
  assert.deepEqual(chunkTreePoints(4, -3), chunkTreePoints(4, -3));
  assert.ok(chunkTreePoints(4, -3).length >= 1);
  assert.ok(chunkTreePoints(4, -3).length <= 2);
  assert.notDeepEqual(chunkTreePoints(4, -3), chunkTreePoints(5, -3));
});

test('touching a mysterious tree costs one health point', () => {
  assert.equal(TREE_CONTACT_DAMAGE, 1);
  assert.equal(TREE_ATTACKS, false);
  assert.equal(TREE_IDLE_FRAME, 0);
  assert.ok(TREE_ROOT_ORIGIN > .9);
});

test('tree contact damages once until the player leaves its root radius', () => {
  let damage = 0;
  let flashes = 0;
  let knockbacks = 0;
  const system = {
    scene: {
      player: { x: 0, y: 0 },
      enemySystem: {
        damagePlayer(amount, source) {
          damage += amount;
          assert.equal(source, DAMAGE_SOURCE.TREE);
          return true;
        },
      },
      flashEffect() { flashes += 1; },
      physics: { velocityFromRotation() { knockbacks += 1; } },
    },
    loadedChunks: new Set(),
    chunkRadius: 0,
    loadChunk() {},
  };
  const tree = {
    active: true, contactLatched: false, chunkX: 0, chunkY: 0, x: 20, y: 20,
    setFrame() { return this; },
    setDepth() { return this; },
  };
  system.trees = { getChildren: () => [tree] };
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, TREE_CONTACT_DAMAGE);
  assert.equal(flashes, 0);
  assert.equal(knockbacks, 0);
  system.scene.player.x = tree.x + TREE_CONTACT_RELEASE_DISTANCE + 1;
  system.scene.player.y = tree.y;
  WorldObstacleSystem.prototype.update.call(system);
  assert.equal(tree.contactLatched, false);
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, TREE_CONTACT_DAMAGE * 2);
});

test('nearby trees remain on their dormant visual frame', () => {
  let frame = -1;
  const tree = {
    active: true, chunkX: 0, chunkY: 0, y: 20, alpha: 1,
    setFrame(value) { frame = value; return this; },
    setDepth() { return this; },
  };
  const system = {
    chunkRadius: 0,
    loadedChunks: new Set(),
    loadChunk() {},
    scene: { player: { x: 0, y: 0 } },
    trees: { getChildren: () => [tree] },
  };
  WorldObstacleSystem.prototype.update.call(system);
  assert.equal(frame, TREE_IDLE_FRAME);
});
