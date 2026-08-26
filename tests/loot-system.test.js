import assert from 'node:assert/strict';
import test from 'node:test';
import { LootSystem, xpAttractionRange, xpAttractionSpeed } from '../src/game/LootSystem.js';

test('XP attraction begins at the exact visible outer-light boundary', () => {
  assert.equal(xpAttractionRange(1, 1), 360);
  assert.ok(Math.abs(xpAttractionRange(.82, 1) - 295.2) < 1e-9);
  assert.equal(xpAttractionRange(1, 1.5), 540);
});

test('a spark at the light edge is pulled immediately while one outside stays still', () => {
  const edge = { active: true, x: 360, y: 0, attracting: false };
  const outside = { active: true, x: 361, y: 0, attracting: false };
  const moves = [];
  const scene = {
    physics: {
      add: { overlap() {} },
      moveToObject(gem, _player, speed) { moves.push({ gem, speed }); },
    },
    player: { x: 0, y: 0 },
    gems: { getChildren: () => [edge, outside] },
    chests: {},
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
  assert.deepEqual(moves, [{ gem: edge, speed: xpAttractionSpeed(360, 360) }]);
  assert.ok(moves[0].speed >= 460);
});
