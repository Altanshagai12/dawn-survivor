import assert from 'node:assert/strict';
import test from 'node:test';
import { directionalPose, facingVector, playDirectional } from '../src/game/animations.js';
import {
  aimFromClientPoint, anchoredStickVector, gameVectorFromClient, InputController, PointerFireLatch, radialDeadZone,
  smoothDirection, smoothStick, stickOriginOffset, surfacePointFromClient, usesCanvasFire,
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

test('player left octants mirror known-good right-facing animation rows', () => {
  assert.deepEqual(directionalPose(-1, 0, true), {
    row: 6, frameRow: 2, direction: 'e', flipX: true,
  });
  assert.deepEqual(directionalPose(-1, -1, true), {
    row: 7, frameRow: 1, direction: 'ne', flipX: true,
  });
  assert.deepEqual(directionalPose(1, 0, true), {
    row: 2, frameRow: 2, direction: 'e', flipX: false,
  });

  const calls = [];
  const sprite = {
    setFlipX(value) { calls.push(['flip', value]); },
    play(key, repeat) { calls.push(['play', key, repeat]); },
  };
  playDirectional(sprite, 'hero', -1, 0, true, { mirrorLeft: true });
  assert.deepEqual(calls, [['flip', true], ['play', 'hero-e', true]]);
  assert.equal(sprite.directionRow, 6);
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

test('mobile aim starts from the touched point and requires a deliberate drag', () => {
  const origin = { clientX: 730, clientY: 310 };
  assert.deepEqual(anchoredStickVector(origin, origin, 32, false, .16), {
    raw: { x: 0, y: 0 }, adjusted: { x: 0, y: 0 },
  });
  const drag = anchoredStickVector({ clientX: 746, clientY: 310 }, origin, 32, false, .16);
  assert.equal(drag.raw.x, .5);
  assert.equal(drag.raw.y, 0);
  assert.ok(drag.adjusted.x > .4 && drag.adjusted.y === 0);
  assert.deepEqual(stickOriginOffset(origin, { left: 670, top: 250, width: 96, height: 96 }), { x: 12, y: 12 });
});

test('mobile canvas taps do not bypass the aim stick while desktop mouse fire remains enabled', () => {
  assert.equal(usesCanvasFire('touch'), false);
  assert.equal(usesCanvasFire('pen'), false);
  assert.equal(usesCanvasFire('mouse'), true);
});

test('aim-stick binding visually re-centers on touch and fires only after drag', () => {
  const previousDocument = globalThis.document;
  const listeners = {};
  const knob = { style: {} };
  const element = {
    style: {},
    querySelector: () => knob,
    getBoundingClientRect: () => ({ left: 670, top: 250, width: 96, height: 96 }),
    setPointerCapture() {},
    addEventListener(type, listener) { listeners[type] = listener; },
    removeEventListener() {},
  };
  globalThis.document = {
    documentElement: { classList: { contains: () => false } },
    getElementById: () => element,
  };
  try {
    const controller = {
      cleanups: [], pointerPoint: { clientX: 1, clientY: 1 },
      touchAimActive: false, touchAimFiring: false,
    };
    const target = { x: 0, y: 0 };
    InputController.prototype.bindStick.call(controller, 'aim-stick', target, true);
    const event = (clientX, clientY) => ({
      pointerId: 7, clientX, clientY, stopPropagation() {}, preventDefault() {},
    });
    listeners.pointerdown(event(730, 310));
    assert.deepEqual(target, { x: 0, y: 0 });
    assert.equal(controller.touchAimFiring, false);
    assert.equal(element.style.transform, 'translate(12px, 12px)');
    assert.equal(knob.style.transform, 'translate(0px, 0px)');
    listeners.pointermove(event(746, 310));
    assert.ok(target.x > .35);
    assert.equal(controller.touchAimFiring, true);
    listeners.pointerup(event(746, 310));
    assert.deepEqual(target, { x: 0, y: 0 });
    assert.equal(element.style.transform, '');
  } finally {
    globalThis.document = previousDocument;
  }
});
