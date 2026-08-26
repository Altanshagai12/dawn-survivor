import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TREE_ATTACKS, TREE_CHUNK_SIZE, TREE_COLLIDER_RADIUS, TREE_CONTACT_DAMAGE,
  TREE_CONTACT_EXIT_GRACE_MS, TREE_IDLE_FRAME, TREE_MIN_SPACING,
  TREE_PLAYER_SPAWN_CLEARANCE, TREE_SAFE_START_RADIUS,
  WorldObstacleSystem, chunkTreePoints,
} from '../src/game/WorldObstacleSystem.js';
import { DAMAGE_SOURCE } from '../src/game/EnemySystem.js';

test('tree placement is deterministic, sparse, safe, and separated', () => {
  assert.deepEqual(chunkTreePoints(4, -3), chunkTreePoints(4, -3));
  assert.ok(chunkTreePoints(4, -3).length >= 1 && chunkTreePoints(4, -3).length <= 3);
  const points = [];
  for (let y = -3; y <= 3; y += 1) for (let x = -3; x <= 3; x += 1) points.push(...chunkTreePoints(x, y));
  assert.ok(points.length >= 40 && points.length <= 147);
  assert.ok(points.every(({ x, y }) => Math.hypot(x, y) > TREE_SAFE_START_RADIUS));
  points.forEach((point, index) => points.slice(index + 1).forEach((other) => {
    assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= TREE_MIN_SPACING - 1e-6);
  }));
  assert.equal(TREE_CHUNK_SIZE, 864);
});

test('trees are dormant hazards with a solid circular trunk and root collider', () => {
  assert.equal(TREE_CONTACT_DAMAGE, 1);
  assert.equal(TREE_ATTACKS, false);
  assert.equal(TREE_IDLE_FRAME, 0);
  assert.ok(TREE_COLLIDER_RADIUS >= 40);
  assert.ok(TREE_MIN_SPACING >= 320);
});

test('a chunk never materializes a tree on top of the player', () => {
  const spawned = [];
  const points = chunkTreePoints(2, 2);
  const system = {
    loadedChunks: new Set(),
    treeCap: 12,
    trees: { countActive: () => 0 },
    scene: { player: { ...points[0] } },
    spawnTree(x, y) { spawned.push({ x, y }); },
  };
  WorldObstacleSystem.prototype.loadChunk.call(system, 2, 2);
  assert.ok(spawned.every(({ x, y }) => Math.hypot(x - points[0].x, y - points[0].y)
    >= TREE_PLAYER_SPAWN_CLEARANCE));
  assert.equal(spawned.length, points.length - 1);
});

test('tree contact damages once until the player exits the root', () => {
  let damage = 0;
  const system = {
    scene: {
      time: { now: 1000 },
      enemySystem: { damagePlayer(amount, source) { damage += amount; assert.equal(source, DAMAGE_SOURCE.TREE); } },
      player: { x: 0, y: 0 },
    },
    loadedChunks: new Set(), chunkRadius: 0, loadChunk() {},
  };
  const tree = {
    active: true, contactLatched: false, lastContactAt: -Infinity, chunkX: 0, chunkY: 0, y: 0, alpha: 1,
    setFrame() { return this; }, setDepth() { return this; },
  };
  system.trees = { getChildren: () => [tree] };
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, 1);
  system.scene.time.now += TREE_CONTACT_EXIT_GRACE_MS + 1;
  WorldObstacleSystem.prototype.update.call(system);
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, 2);
});

test('spawned trees center a circular static body at the root', () => {
  let circle;
  const body = { setCircle(...args) { circle = args; return this; } };
  const shadow = {
    active: true, alpha: .32, setDepth() { return this; }, setDisplaySize() { return this; },
    setAlpha() { return this; }, setPosition() { return this; }, destroy() {},
  };
  const tree = {
    x: 12, y: 34, depth: 17, alpha: 1, displayWidth: 117, displayHeight: 156, body, scaleX: 1,
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setScale(value) { this.scaleX = value; return this; }, setDepth() { return this; }, refreshBody() {}, once() {},
  };
  const system = { trees: { create: () => tree }, scene: { add: { image: () => shadow } } };
  WorldObstacleSystem.prototype.spawnTree.call(system, tree.x, tree.y, 0, 0);
  assert.equal(circle[0] * tree.scaleX, TREE_COLLIDER_RADIUS);
  assert.ok(Math.abs((circle[1] + circle[0]) * tree.scaleX
    - tree.displayWidth * .5) < 1e-9);
  assert.ok(Math.abs((circle[2] + circle[0]) * tree.scaleX
    - tree.displayHeight * tree.originY) < 1e-9);
});
