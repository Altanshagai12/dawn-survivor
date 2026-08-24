import assert from 'node:assert/strict';
import test from 'node:test';
import { aimFromPointer, PointerFireLatch } from '../src/game/InputController.js';

test('refreshes the pointer world point against the live camera before aiming', () => {
  const camera = { scrollX: -40, scrollY: 25 };
  const pointer = {
    worldX: 0,
    worldY: 0,
    updateWorldPoint(actualCamera) {
      assert.equal(actualCamera, camera);
      this.worldX = -80;
      this.worldY = 25;
    },
  };

  assert.deepEqual(aimFromPointer(pointer, camera, { x: 0, y: 25 }), { x: -1, y: 0 });
});

test('keeps a quick desktop click alive for one simulation frame', () => {
  const latch = new PointerFireLatch();
  latch.press();
  latch.release();
  assert.equal(latch.consume(), true);
  assert.equal(latch.consume(), false);

  latch.press();
  assert.equal(latch.consume(), true);
  assert.equal(latch.consume(), true);
  latch.release();
  assert.equal(latch.consume(), false);
});
