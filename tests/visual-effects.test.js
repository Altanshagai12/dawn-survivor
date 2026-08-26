import assert from 'node:assert/strict';
import test from 'node:test';
import { reloadIndicatorState } from '../src/game/VisualEffects.js';

test('reload progress is positioned immediately above the hero', () => {
  const player = { x: 120, y: 240, displayHeight: 78 };
  const visual = reloadIndicatorState(player, {
    reloading: true, reloadProgress: 500, reloadMs: 1000,
    weapon: {}, weaponCharge: 0,
  });
  assert.deepEqual(visual, {
    visible: true, progress: .5, x: 120, y: 189,
    color: 0x65e6ff,
  });
});

test('crossbow charge shares the hero indicator and hides when empty', () => {
  const player = { x: 10, y: 20, displayHeight: 40 };
  const charging = reloadIndicatorState(player, {
    reloading: false, reloadProgress: 0, reloadMs: 1000,
    weapon: { chargeSeconds: 2.5 }, weaponCharge: .6,
  });
  assert.equal(charging.visible, true);
  assert.equal(charging.progress, .6);
  assert.equal(charging.color, 0xffd36c);
  assert.equal(reloadIndicatorState(player, { ...charging, weapon: {}, weaponCharge: 0 }).visible, false);
});
