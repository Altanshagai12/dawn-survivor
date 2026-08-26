import assert from 'node:assert/strict';
import test from 'node:test';
import { LootSystem, xpAttractionRange, xpAttractionSpeed } from '../src/game/LootSystem.js';

test('XP attraction begins where bright light hands off to the faint outer light', () => {
  assert.equal(xpAttractionRange(1, 1), 140);
  assert.ok(Math.abs(xpAttractionRange(.82, 1) - 126) < 1e-9);
  assert.equal(xpAttractionRange(1, 1.5), 210);
});

test('a spark at the light edge is pulled immediately while one outside stays still', () => {
  const edge = { active: true, x: 140, y: 0, attracting: false };
  const outside = { active: true, x: 141, y: 0, attracting: false };
  const moves = [];
  const scene = {
    physics: {
      add: { overlap() {} },
      moveToObject(gem, _player, speed) { moves.push({ gem, speed }); },
    },
    player: { x: 0, y: 0 },
    gems: { getChildren: () => [edge, outside] },
    chests: { getChildren: () => [] },
    performance: { lightScale: 1 },
    state: { multiplierStats: { pickup: 1 } },
  };
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Distance: { Between: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) } } };
  try {
    new LootSystem(scene).update();
  } finally {
    globalThis.Phaser = previousPhaser;
  }
  assert.equal(edge.attracting, true);
  assert.equal(outside.attracting, false);
  assert.deepEqual(moves, [{ gem: edge, speed: xpAttractionSpeed(140, 140) }]);
  assert.ok(moves[0].speed >= 460);
});

test('a boss chest is pulled from the same light edge and stops floating', () => {
  let stopped = 0;
  const chest = {
    active: true, x: 126, y: 0, attracting: false,
    floatTween: { stop() { stopped += 1; } },
  };
  const moves = [];
  const scene = {
    player: { x: 0, y: 0 },
    physics: {
      add: { overlap() {} },
      moveToObject(item, _player, speed) { moves.push({ item, speed }); },
    },
    gems: { getChildren: () => [] },
    chests: { getChildren: () => [chest] },
    performance: { lightScale: .82 },
    state: { multiplierStats: { pickup: 1 } },
  };
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Distance: { Between: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) } } };
  try {
    new LootSystem(scene).update();
  } finally {
    globalThis.Phaser = previousPhaser;
  }
  assert.equal(chest.attracting, true);
  assert.equal(chest.floatTween, null);
  assert.equal(stopped, 1);
  assert.deepEqual(moves, [{ item: chest, speed: xpAttractionSpeed(126, 126) }]);
});
