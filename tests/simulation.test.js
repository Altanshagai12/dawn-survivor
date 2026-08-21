import assert from 'node:assert/strict';
import test from 'node:test';
import {
  directionRowFromVector,
  enemyHealthScale,
  sampleWithoutReplacement,
  scoreForRun,
  spawnInterval,
  weightedPick,
  xpRequired,
} from '../src/game/simulation.js';

test('maps movement to eight directional rows', () => {
  assert.equal(directionRowFromVector(0, -1), 0);
  assert.equal(directionRowFromVector(1, -1), 1);
  assert.equal(directionRowFromVector(1, 0), 2);
  assert.equal(directionRowFromVector(0, 1), 4);
  assert.equal(directionRowFromVector(-1, 0), 6);
});

test('difficulty ramps during the ten-minute run', () => {
  assert.ok(spawnInterval(590) < spawnInterval(10));
  assert.ok(enemyHealthScale(590) > enemyHealthScale(10));
  assert.equal(xpRequired(1), 5);
  assert.equal(xpRequired(20), 235);
});

test('random helpers are deterministic with an injected source', () => {
  const items = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
  assert.equal(weightedPick(items, () => 0).id, 'a');
  assert.equal(weightedPick(items, () => .99).id, 'b');
  assert.deepEqual(sampleWithoutReplacement(['a', 'b', 'c'], 2, () => 0), ['a', 'b']);
});

test('winning grants a meaningful score bonus', () => {
  const run = { kills: 100, bosses: 3, level: 15, elapsed: 600 };
  assert.equal(scoreForRun({ ...run, won: true }) - scoreForRun({ ...run, won: false }), 5000);
});
