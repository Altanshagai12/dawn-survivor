import assert from 'node:assert/strict';
import test from 'node:test';
import { Spawner, followedCameraView, rectangularEdgeSpawn } from '../src/game/Spawner.js';

const view = { x: 100, y: 200, right: 900, bottom: 650, width: 800, height: 450 };

test('spawns outside one of the rectangular camera edges', () => {
  const top = rectangularEdgeSpawn(view, (() => { const values = [0, 0, .5]; return () => values.shift(); })(), 36, 108);
  assert.equal(top.x, 500);
  assert.equal(top.y, 164);
  const right = rectangularEdgeSpawn(view, (() => { const values = [0, .3, .25]; return () => values.shift(); })(), 36, 108);
  assert.equal(right.x, 936);
  assert.equal(right.y, 312.5);
});

test('every side remains strictly outside the visible rectangle', () => {
  for (const sideRoll of [.01, .26, .51, .76]) {
    const point = rectangularEdgeSpawn(view, (() => {
      const values = [.4, sideRoll, .5];
      return () => values.shift();
    })());
    const inside = point.x >= view.x && point.x <= view.right && point.y >= view.y && point.y <= view.bottom;
    assert.equal(inside, false);
  }
});

test('first-frame spawn view follows the player before camera smoothing settles', () => {
  const followed = followedCameraView({ x: 0, y: 0 }, { width: 1280, height: 720, zoom: 1.05 });
  assert.ok(followed.x < -600 && followed.right > 600);
  assert.ok(followed.y < -340 && followed.bottom > 340);
});

test('encounter scheduler reaches Elder, Shub, and the final 16-enemy wave', () => {
  const scene = {
    state: { elapsed: 180 },
    performance: { enemyCap: 620 },
    enemyDefinitions: {},
    enemies: { getChildren: () => [], countActive: () => 0 },
  };
  const spawner = new Spawner(scene);
  const bosses = [];
  const waves = [];
  spawner.spawnBoss = (boss) => bosses.push(boss.id);
  spawner.spawnEnemy = (_enemy, _point, session) => waves.push(session.id);
  spawner.update(0);
  assert.deepEqual(bosses, ['elder']);
  scene.state.elapsed = 300;
  spawner.update(0);
  assert.deepEqual(bosses, ['elder', 'shub']);
  scene.state.elapsed = 480;
  spawner.update(0);
  assert.equal(waves.filter((id) => id === 'tentacle-final').length, 16);
});
