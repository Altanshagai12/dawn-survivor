import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraCompensatedViewport, gameDeviceProfile, gameRenderResolution } from '../src/game/deviceProfile.js';
import { FIRING_MOVE_MULTIPLIER, movementMultiplier } from '../src/game/movement.js';
import { recoilPose } from '../src/game/PlayerFeedback.js';
import { runDustOrigin, spawnRunDust } from '../src/game/VisualEffects.js';

test('mobile preserves the same enemy difficulty while reducing only visual cost', () => {
  const mobile = gameDeviceProfile({ coarse: true, width: 390, cores: 4, memory: 4 });
  const desktop = gameDeviceProfile({ coarse: false, width: 1440, cores: 12, memory: 16 });
  assert.equal(mobile.mobile, true);
  assert.equal(mobile.enemyCap, desktop.enemyCap);
  assert.equal(mobile.enemyCap, 620);
  assert.ok(mobile.vfxCap < desktop.vfxCap);
  assert.ok(mobile.premiumVfxCap < desktop.premiumVfxCap);
  assert.ok(mobile.audioVoiceCap < desktop.audioVoiceCap);
  assert.ok(mobile.premiumVfxCap <= 48);
  assert.ok(mobile.audioVoiceCap <= 10);
  assert.ok(mobile.cameraZoom < desktop.cameraZoom);
});

test('the ground compensates camera zoom and fills every viewport edge', () => {
  const mobile = cameraCompensatedViewport(844, 390, .82);
  assert.ok(Math.abs(mobile.width * .82 - 844) < 1e-9);
  assert.ok(Math.abs(mobile.height * .82 - 390) < 1e-9);
  const desktop = cameraCompensatedViewport(1440, 900, 1.05);
  assert.ok(Math.abs(desktop.width * 1.05 - 1440) < 1e-9);
  assert.ok(Math.abs(desktop.height * 1.05 - 900) < 1e-9);
});

test('capable high-density phones preserve native 3x detail while constrained phones stay bounded', () => {
  assert.equal(gameRenderResolution(3, { coarse: true, width: 844, cores: 6, memory: 8 }), 3);
  assert.equal(gameRenderResolution(3, { coarse: true, width: 844, cores: 4, memory: 4 }), 2.5);
  assert.equal(gameRenderResolution(1.5), 1.5);
  assert.equal(gameRenderResolution(0), 1);
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
  assert.ok(pose.muzzleLift > 0);
  assert.equal('scaleX' in pose, false, 'recoil must not resize the physics body');
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
