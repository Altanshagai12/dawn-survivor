import { spawnRunDust } from './VisualEffects.js';

export function nextWeaponCharge(current, weapon, delta, moving) {
  if (!weapon.chargeSeconds || moving) return 0;
  return Math.min(1, current + delta / weapon.chargeSeconds);
}

export function updateWeaponCharge(state, delta, input) {
  const moving = Math.hypot(input.moveX, input.moveY) > .18;
  state.weaponCharge = nextWeaponCharge(state.weaponCharge, state.weapon, delta, moving);
}

export function updateMovementFeedback(scene, delta, input) {
  const moving = Math.hypot(input.moveX, input.moveY) > .3;
  if (!moving) { scene.dustAccumulator = 0; return; }
  scene.dustAccumulator += delta;
  if (scene.dustAccumulator < .09) return;
  scene.dustAccumulator = 0;
  spawnRunDust(scene, scene.player, input.moveX, input.moveY);
}
