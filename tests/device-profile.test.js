import assert from 'node:assert/strict';
import test from 'node:test';
import { gameDeviceProfile } from '../src/game/deviceProfile.js';
import { FIRING_MOVE_MULTIPLIER, movementMultiplier } from '../src/game/movement.js';
import { recoilPose } from '../src/game/PlayerFeedback.js';
import { runDustOrigin, spawnRunDust } from '../src/game/VisualEffects.js';

test('mobile profile bounds expensive entities while preserving desktop quality', () => {
  const mobile = gameDeviceProfile({ coarse: true, width: 390, cores: 4, memory: 4 });
  const desktop = gameDeviceProfile({ coarse: false, width: 1440, cores: 12, memory: 16 });
  assert.equal(mobile.mobile, true);
  assert.ok(mobile.enemyCap < desktop.enemyCap);
  assert.ok(mobile.vfxCap < desktop.vfxCap);
  assert.ok(mobile.cameraZoom < desktop.cameraZoom);
  assert.equal(desktop.enemyCap, 135);
});

test('firing movement is slower until Run and Gun removes the penalty', () => {
  assert.equal(FIRING_MOVE_MULTIPLIER, .5);
  assert.equal(movementMultiplier(false, false), 1);
  assert.equal(movementMultiplier(true, false), .5);
  assert.equal(movementMultiplier(true, true), 1);
});

test('every shot creates a brief raised recoil pose', () => {
  const pose = recoilPose(1, 0);
  assert.ok(pose.angle < 0);
  assert.ok(pose.scaleX > 1);
  assert.ok(pose.scaleY < 1);
});

test('running dust starts at the feet and trails opposite movement', () => {
  const right = runDustOrigin({ x: 100, y: 80, displayHeight: 60 }, 1, 0);
  const up = runDustOrigin({ x: 100, y: 80, displayHeight: 60 }, 0, -1);
  assert.deepEqual(right, { x: 86, y: 101.6, directionX: 1, directionY: 0 });
  assert.equal(up.x, 100);
  assert.equal(up.y, 109.6);
  assert.equal(up.directionY, -1);
});

test('running dust renders above the shadow and remains behind the hero', () => {
  const images = [];
  const tweens = [];
  const scene = {
    add: {
      image(x, y, texture) {
        const image = {
          x, y, texture,
          setDepth(value) { this.depth = value; return this; },
          setAlpha(value) { this.alpha = value; return this; },
          setScale(xValue, yValue) { this.scale = [xValue, yValue]; return this; },
        };
        images.push(image);
        return image;
      },
    },
    tweens: { add(config) { tweens.push(config); } },
  };
  const previousPhaser = globalThis.Phaser;
  globalThis.Phaser = { Math: { Between: () => 0 } };
  try {
    spawnRunDust(scene, { x: 100, y: 80, displayHeight: 60, depth: 25 }, 1, 0);
  } finally {
    globalThis.Phaser = previousPhaser;
  }
  assert.equal(images.length, 2);
  assert.ok(images.every((image) => image.depth === 24.5));
  assert.ok(images.every((image) => image.depth > 24 && image.depth < 25));
  assert.deepEqual(tweens.map((tween) => tween.duration), [430, 360]);
});
