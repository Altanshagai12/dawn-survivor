import assert from 'node:assert/strict';
import test from 'node:test';
import { edgeSpawnOffsets } from '../src/game/Spawner.js';

test('fast enemies spawn outside the view while their warning stays inside', () => {
  const horizontal = edgeSpawnOffsets(600, 400, 0, 90);
  assert.equal(horizontal.x, 805);
  assert.equal(horizontal.warningX, 554);
  assert.ok(Math.abs(horizontal.warningY) < .001);

  const vertical = edgeSpawnOffsets(195, 422, Math.PI / 2, 90);
  assert.ok(vertical.y > 422);
  assert.ok(vertical.warningY < 422);
});
