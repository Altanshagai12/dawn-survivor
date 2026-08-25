import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TREE_ATTACKS, TREE_CONTACT_DAMAGE, TREE_ROOT_ORIGIN, chunkTreePoints,
} from '../src/game/WorldObstacleSystem.js';

test('mysterious trees have deterministic sparse world placement', () => {
  assert.deepEqual(chunkTreePoints(4, -3), chunkTreePoints(4, -3));
  assert.ok(chunkTreePoints(4, -3).length >= 1);
  assert.ok(chunkTreePoints(4, -3).length <= 2);
  assert.notDeepEqual(chunkTreePoints(4, -3), chunkTreePoints(5, -3));
});

test('touching a mysterious tree costs one health point', () => {
  assert.equal(TREE_CONTACT_DAMAGE, 1);
  assert.equal(TREE_ATTACKS, false);
  assert.ok(TREE_ROOT_ORIGIN > .9);
});
