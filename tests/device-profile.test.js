import assert from 'node:assert/strict';
import test from 'node:test';
import { gameDeviceProfile } from '../src/game/deviceProfile.js';
import { FIRING_MOVE_MULTIPLIER, movementMultiplier } from '../src/game/movement.js';
import { recoilPose } from '../src/game/PlayerFeedback.js';

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
  assert.equal(FIRING_MOVE_MULTIPLIER, .78);
  assert.equal(movementMultiplier(false, false), 1);
  assert.equal(movementMultiplier(true, false), .78);
  assert.equal(movementMultiplier(true, true), 1);
});

test('every shot creates a brief raised recoil pose', () => {
  const pose = recoilPose(1, 0);
  assert.ok(pose.angle < 0);
  assert.ok(pose.scaleX > 1);
  assert.ok(pose.scaleY < 1);
});
