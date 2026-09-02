import { spawnRunDust } from './VisualEffects.js';
import { characterSizeScale } from './PlayerHitbox.js?build=20260902b';
import { heldWeaponMuzzle } from './SkinPresentation.js?build=20260902e';

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
  if (scene.dustAccumulator < (scene.performance?.dustInterval || .09)) return;
  scene.dustAccumulator = 0;
  spawnRunDust(scene, scene.player, input.moveX, input.moveY);
}

export function recoilPose(strength, angle) {
  const lean = Math.cos(angle) >= 0 ? -1 : 1;
  return {
    angle: lean * 2.4 * strength,
    muzzleLift: 2.4 * strength,
  };
}

export function triggerShotFeedback(scene, angle) {
  scene.shotRecoil = { angle, strength: 1 };
  const muzzle = heldWeaponMuzzle(scene, angle);
  const x = muzzle?.x ?? scene.player.x + Math.cos(angle) * 18;
  const y = muzzle?.y ?? scene.player.y + Math.sin(angle) * 18 - 3;
  const lift = scene.add.rectangle(x, y, 15, 2, 0xe8fdff, .72)
    .setOrigin(0, .5).setRotation(angle).setDepth(35).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: lift, x: x + Math.cos(angle) * 9, y: y + Math.sin(angle) * 9 - 2,
    scaleX: 1.35, alpha: 0, duration: 95, ease: 'Quad.Out', onComplete: () => lift.destroy(),
  });
}

export function updateShotFeedback(scene, delta) {
  const recoil = scene.shotRecoil;
  const baseScale = scene.playerBaseScale * characterSizeScale(scene.state.mods);
  if (!recoil?.strength) {
    scene.player.setAngle(0).setScale(baseScale);
    return;
  }
  recoil.strength = Math.max(0, recoil.strength - delta * 10.5);
  const pose = recoilPose(recoil.strength, recoil.angle);
  scene.player.setAngle(pose.angle).setScale(baseScale);
}
