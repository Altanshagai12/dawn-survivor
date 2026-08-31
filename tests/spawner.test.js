import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Spawner, enemySpawnSnapshot, followedCameraView,
  rectangularEdgeSpawn, shubArenaLayout,
} from '../src/game/Spawner.js';

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

test('the Shub arena opens on the player and places the boss safely inside it', () => {
  const player = { x: 712, y: -245 };
  const boss = { radius: 55 };
  const layout = shubArenaLayout(player, boss, () => 0);
  assert.deepEqual(layout.center, player);
  assert.equal(layout.boss.y, player.y);
  assert.ok(layout.boss.x > player.x);
  assert.ok(layout.boss.x + boss.radius + 36 <= player.x + 216);
});

test('spawning Shub activates the barrier at the player snapshot without teleporting first', () => {
  let activatedAt = null;
  const scene = {
    player: { x: 320, y: -180 },
    obstacles: { isSpawnClear: () => true },
    barrier: { activate: (x, y) => { activatedAt = { x, y }; } },
    ui: { toast() {} },
    cameras: { main: { shake() {} } },
  };
  const spawner = new Spawner(scene);
  spawner.spawnPoint = () => { throw new Error('Shub must not use the offscreen spawn point'); };
  spawner.acquire = (_atlas, x, y) => ({ x, y });
  spawner.setupSprite = (sprite) => sprite;
  const sprite = spawner.spawnBoss({ id: 'shub', name: 'Shub', radius: 55, hp: 2500 });
  assert.deepEqual(activatedAt, scene.player);
  assert.notDeepEqual({ x: sprite.x, y: sprite.y }, scene.player);
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

test('spawn snapshots keep fixed session HP across the six and eight minute boundaries', () => {
  const thirtyHpSession = { id: 'tentacle-2', hp: 30 };
  const sixtyHpSession = { id: 'tentacle-3', hp: 60 };
  const finalSession = { id: 'tentacle-final', hp: 100 };
  const oldAtSix = enemySpawnSnapshot({ hp: 24 }, thirtyHpSession, 359);
  oldAtSix.hp = 5;
  const newAfterSix = enemySpawnSnapshot({ hp: 24 }, sixtyHpSession, 361);
  assert.deepEqual(oldAtSix, {
    hp: 5, maxHp: 30, spawnSessionId: 'tentacle-2', spawnTime: 359,
  });
  assert.deepEqual(newAfterSix, {
    hp: 60, maxHp: 60, spawnSessionId: 'tentacle-3', spawnTime: 361,
  });

  const oldAtEight = enemySpawnSnapshot({ hp: 24 }, sixtyHpSession, 479.9);
  const newAfterEight = enemySpawnSnapshot({ hp: 24 }, finalSession, 480.1);
  assert.equal(oldAtEight.maxHp, 60);
  assert.equal(newAfterEight.maxHp, 100);
});

test('spawnEnemy copies fixed session HP once and ignores the player damage build', () => {
  const scene = {
    state: { elapsed: 520, weapon: { damage: 999 }, multiplierStats: { damage: 9 } },
  };
  const spawner = new Spawner(scene);
  spawner.acquire = () => ({});
  spawner.setupSprite = (sprite, _definition, _atlas, snapshot) => Object.assign(sprite, snapshot);
  const enemy = spawner.spawnEnemy(
    { id: 'tentacle', hp: 24 }, { x: 0, y: 0 }, { id: 'tentacle-final', hp: 100 },
  );
  assert.deepEqual(enemy, {
    hp: 100, maxHp: 100, spawnSessionId: 'tentacle-final', spawnTime: 520,
  });
});
