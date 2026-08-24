import assert from 'node:assert/strict';
import test from 'node:test';
import { facingVector } from '../src/game/animations.js';
import { aimFromClientPoint, PointerFireLatch } from '../src/game/InputController.js';

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
