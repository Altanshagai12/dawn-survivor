import assert from 'node:assert/strict';
import test from 'node:test';
import { edgeSpawnOffsets, enemyMoveSpeed } from '../src/game/Spawner.js';
import { edgeWarningPosition, isInsideView } from '../src/game/WinglingFeedback.js';

test('fast enemies spawn outside the view while their warning stays inside', () => {
  const horizontal = edgeSpawnOffsets(600, 400, 0, 90);
  assert.equal(horizontal.x, 805);
  assert.equal(horizontal.warningX, 554);
  assert.ok(Math.abs(horizontal.warningY) < .001);

  const vertical = edgeSpawnOffsets(195, 422, Math.PI / 2, 90);
  assert.ok(vertical.y > 422);
  assert.ok(vertical.warningY < 422);
});

test('wingling warning is pinned inside the camera until the enemy appears', () => {
  const view = { left: 0, right: 390, top: 0, bottom: 844, width: 390, height: 844, centerX: 195, centerY: 422 };
  const side = edgeWarningPosition(view, 520, 300);
  const top = edgeWarningPosition(view, 240, -180);
  assert.ok(side.x <= 342 && side.x >= 48);
  assert.ok(top.y >= 48 && top.y <= 796);
  assert.equal(isInsideView(view, 195, 422), true);
  assert.equal(isInsideView(view, 520, 300), false);
});

test('enemy movement speed stays fixed instead of silently accelerating over time', () => {
  assert.equal(enemyMoveSpeed({ speed: 48 }), 48);
  assert.equal(enemyMoveSpeed({ speed: 92 }), 92);
});
