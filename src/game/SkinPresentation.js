import { weaponGrip, weaponHandPosition, weaponMuzzleUV } from './WeaponHandAnchors.js?build=20260902e';

export const WEAPON_SKIN_ALPHA = .96;

export function applyWeaponSkin(scene) {
  if (!scene?.player || !scene.state?.skin || !scene.skinWeaponKey) return null;
  const grip = weaponGrip(scene.state.skin.id, scene.state.weapon?.id);
  const weapon = scene.add.image(scene.player.x, scene.player.y, scene.skinWeaponKey)
    .setOrigin(grip.x, grip.y).setDepth(32).setAlpha(WEAPON_SKIN_ALPHA);
  const presentation = { scene, weapon, grip, visibility: 1 };
  syncWeaponSkin(presentation, scene.player);
  return presentation;
}

export function restorePlayerTint(scene) {
  if (scene?.player?.active) scene.player.clearTint();
}

export function setWeaponSkinVisibility(presentation, multiplier = 1) {
  if (!presentation) return;
  presentation.visibility = Math.max(0, Math.min(1, multiplier));
  presentation.weapon.setAlpha(WEAPON_SKIN_ALPHA * presentation.visibility);
}

function heldWeaponPose(presentation, player, aimAngle) {
  const facing = presentation.scene.facing || { x: 0, y: 1 };
  const angle = Number.isFinite(aimAngle) ? aimAngle : Math.atan2(facing.y, facing.x);
  const hand = weaponHandPosition(presentation.scene.state?.hero?.id, player);
  const height = player.displayHeight || (player.height || 181) * Math.abs(player.scaleY ?? 1);
  const width = presentation.weapon.width || 768;
  const depth = Number.isFinite(player.depth) ? player.depth : 25;
  const flipY = Math.cos(angle) < 0;
  const grip = presentation.grip || weaponGrip(presentation.scene.state?.skin?.id, presentation.scene.state?.weapon?.id);
  return { ...hand, angle, flipY, grip, scale: height * .73 / width,
    depth: depth + (Math.sin(angle) < -.2 ? -1 : 1) };
}

export function syncWeaponSkin(presentation, player, _deltaSeconds = 0, aimAngle) {
  if (!presentation || !player?.active) return;
  const pose = heldWeaponPose(presentation, player, aimAngle);
  presentation.weapon.setPosition(pose.x, pose.y)
    // Mirror the origin with the pixels so facing left cannot move the grip.
    .setOrigin(pose.grip.x, pose.flipY ? 1 - pose.grip.y : pose.grip.y)
    .setDepth(pose.depth).setFlipY(pose.flipY)
    .setRotation(pose.angle).setScale(pose.scale);
}

export function heldWeaponMuzzle(scene, aimAngle) {
  const presentation = scene?.weaponSkin;
  if (!scene?.state?.skin || !scene.player?.active || !presentation?.weapon?.active) return null;
  // Recompute from the current body frame, size, recoil and shot aim. Do not
  // read yesterday's rendered weapon transform at the physics/VFX boundary.
  const pose = heldWeaponPose(presentation, scene.player, aimAngle);
  const muzzle = weaponMuzzleUV(scene.state.skin.id, scene.state.weapon?.id);
  const x = (muzzle.x - pose.grip.x) * (presentation.weapon.width || 768) * pose.scale;
  const y = (muzzle.y - pose.grip.y) * (presentation.weapon.height || 384) * pose.scale * (pose.flipY ? -1 : 1);
  return {
    x: pose.x + x * Math.cos(pose.angle) - y * Math.sin(pose.angle),
    y: pose.y + x * Math.sin(pose.angle) + y * Math.cos(pose.angle),
  };
}

export function destroyWeaponSkin(presentation) {
  presentation?.weapon?.destroy();
}
