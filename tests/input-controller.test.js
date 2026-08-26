import assert from 'node:assert/strict';
import test from 'node:test';
import { facingVector } from '../src/game/animations.js';
import {
  aimFromClientPoint, gameVectorFromClient, PointerFireLatch, radialDeadZone,
  smoothDirection, smoothStick, surfacePointFromClient,
} from '../src/game/InputController.js';

test('maps a host-offset client point through the canvas and live camera', () => {
  const surface = {
    width: 780,
    height: 1688,
    getBoundingClientRect() {
      return { left: 20, top: 70, width: 390, height: 844 };
    },
  };
  const camera = {
    getWorldPoint(x, y) {
      assert.equal(x, 160);
      assert.equal(y, 50);
      return { x: -80, y: 25 };
    },
  };

  assert.deepEqual(
    aimFromClientPoint({ clientX: 100, clientY: 95 }, surface, camera, { x: 0, y: 25 }),
    { x: -1, y: 0 },
  );
});

test('inverse-maps touch controls through the clockwise mobile fallback rotation', () => {
  assert.deepEqual(gameVectorFromClient({ x: 0, y: 1 }, true), { x: 1, y: -0 });
  assert.deepEqual(gameVectorFromClient({ x: 1, y: 0 }, true), { x: 0, y: -1 });
  const surface = {
    width: 844,
    height: 390,
    getBoundingClientRect() {
      return { left: 20, right: 410, top: 70, width: 390, height: 844 };
    },
  };
  assert.deepEqual(
    surfacePointFromClient({ clientX: 310, clientY: 570 }, surface, true),
    { x: 500, y: 100 },
  );
});

test('keeps a quick world tap alive and ignores another pointer release', () => {
  const latch = new PointerFireLatch();
  assert.equal(latch.press(7), true);
  assert.equal(latch.press(8), false);
  assert.equal(latch.release(8), false);
  assert.equal(latch.release(7), true);
  assert.equal(latch.consume(), true);
  assert.equal(latch.consume(), false);

  latch.press(9);
  assert.equal(latch.consume(), true);
  assert.equal(latch.consume(), true);
  latch.release(9);
  assert.equal(latch.consume(), false);
});

test('faces toward aim while firing and movement otherwise', () => {
  const moving = { moveX: -1, moveY: 0, aimX: 0, aimY: -1, firing: false };
  assert.deepEqual(facingVector(moving), { x: -1, y: 0 });
  assert.deepEqual(facingVector({ ...moving, firing: true }), { x: 0, y: -1 });
});

test('holds the last shot direction through idle and reload frames', () => {
  const prior = { x: -1, y: -1 };
  const idle = { moveX: 0, moveY: 0, aimX: -1, aimY: 0, firing: false };
  assert.deepEqual(facingVector(idle, prior, true), { x: -1, y: 0 });
  assert.deepEqual(facingVector({ ...idle, aimX: 1 }, prior, false), prior);
});

test('mobile sticks remove center noise and ease movement without losing aim', () => {
  assert.deepEqual(radialDeadZone({ x: .03, y: -.02 }), { x: 0, y: 0 });
  const moved = smoothStick({ x: 0, y: 0 }, { x: 1, y: 0 }, .46);
  assert.deepEqual(moved, { x: .46, y: 0 });
  assert.deepEqual(smoothDirection({ x: 1, y: 0 }, { x: -1, y: 0 }, .5), { x: -1, y: 0 });
  assert.deepEqual(smoothDirection({ x: 0, y: -1 }, { x: 0, y: 0 }), { x: 0, y: -1 });
});
