import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TREE_ATTACKS, TREE_COLLIDER, TREE_CONTACT_DAMAGE, TREE_CONTACT_EXIT_GRACE_MS, TREE_IDLE_FRAME,
  TREE_MIN_SPACING, TREE_ROOT_ORIGIN, TREE_SAFE_START_RADIUS, WorldObstacleSystem, chunkTreePoints,
  treeRootBodyOffset,
} from '../src/game/WorldObstacleSystem.js';
import { DAMAGE_SOURCE } from '../src/game/EnemySystem.js';

test('mysterious trees have deterministic sparse world placement', () => {
  assert.deepEqual(chunkTreePoints(4, -3), chunkTreePoints(4, -3));
  const points = [];
  for (let y = -5; y <= 5; y += 1) {
    for (let x = -5; x <= 5; x += 1) points.push(...chunkTreePoints(x, y));
  }
  assert.ok(points.length >= 70 && points.length <= 110);
  assert.ok(points.every(({ x, y }) => Math.hypot(x, y) > TREE_SAFE_START_RADIUS));
  points.forEach((point, index) => points.slice(index + 1).forEach((other) => {
    assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= TREE_MIN_SPACING);
  }));
});

test('tree damage uses a compact collider centered on its anchored root', () => {
  assert.equal(TREE_CONTACT_DAMAGE, 1);
  assert.equal(TREE_ATTACKS, false);
  assert.equal(TREE_IDLE_FRAME, 0);
  assert.ok(TREE_ROOT_ORIGIN > .9);
  assert.ok(TREE_COLLIDER.width <= 48);
  assert.ok(TREE_COLLIDER.height <= 20);
});

test('tree contact damages once until collision callbacks stop', () => {
  let damage = 0;
  let flashes = 0;
  let knockbacks = 0;
  const system = {
    scene: {
      player: { x: 0, y: 0 },
      time: { now: 1000 },
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
    active: true, contactLatched: false, lastContactAt: Number.NEGATIVE_INFINITY,
    chunkX: 0, chunkY: 0, x: 20, y: 20,
    setFrame() { return this; },
    setDepth() { return this; },
  };
  system.trees = { getChildren: () => [tree] };
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  system.scene.time.now += TREE_CONTACT_EXIT_GRACE_MS + 1;
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, TREE_CONTACT_DAMAGE);
  assert.equal(flashes, 0);
  assert.equal(knockbacks, 0);
  WorldObstacleSystem.prototype.update.call(system);
  assert.equal(tree.contactLatched, true);
  system.scene.time.now += TREE_CONTACT_EXIT_GRACE_MS + 1;
  WorldObstacleSystem.prototype.update.call(system);
  assert.equal(tree.contactLatched, false);
  WorldObstacleSystem.prototype.touchTree.call(system, tree);
  assert.equal(damage, TREE_CONTACT_DAMAGE * 2);
});

test('spawned trees center their static body on the visual root', () => {
  let colliderSize;
  let colliderOffset;
  const body = {
    setSize(...args) { colliderSize = args; return this; },
    setOffset(...args) { colliderOffset = args; return this; },
  };
  const shadow = {
    active: true, alpha: .32,
    setDepth() { return this; }, setDisplaySize() { return this; }, setAlpha() { return this; },
    setPosition() { return this; }, destroy() {},
  };
  const tree = {
    x: 12, y: 34, depth: 17, alpha: 1, displayWidth: 117, displayHeight: 156,
    originX: .5, originY: TREE_ROOT_ORIGIN, body,
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setScale() { return this; }, setDepth() { return this; },
    refreshBody() {}, once() {},
  };
  const system = {
    trees: { create: () => tree },
    scene: { add: { image: () => shadow } },
  };
  WorldObstacleSystem.prototype.spawnTree.call(system, tree.x, tree.y, 0, 0);
  assert.deepEqual(colliderSize, [TREE_COLLIDER.width, TREE_COLLIDER.height, false]);
  assert.deepEqual(colliderOffset, Object.values(treeRootBodyOffset(tree)));
  const spriteLeft = tree.x - tree.displayWidth * tree.originX;
  const spriteTop = tree.y - tree.displayHeight * tree.originY;
  assert.equal(spriteLeft + colliderOffset[0] + TREE_COLLIDER.width / 2, tree.x);
  assert.equal(spriteTop + colliderOffset[1] + TREE_COLLIDER.height / 2, tree.y);
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
