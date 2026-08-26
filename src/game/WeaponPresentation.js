import { triggerShotFeedback } from './PlayerFeedback.js?build=20260826f';

export const WEAPON_EFFECT_PROFILES = Object.freeze({
  revolver: Object.freeze({ color: 0xffead8, tracer: 48, shake: .0008, duration: 90 }),
  shotgun: Object.freeze({ color: 0xffe2c8, tracer: 44, shake: .00145, duration: 105 }),
  crossbow: Object.freeze({ color: 0xfff1df, tracer: 142, shake: .00055, duration: 125 }),
  flame: Object.freeze({ color: 0xffa13d, tracer: 32, shake: .0009, duration: 145 }),
});

export function weaponEffectProfile(weaponId) {
  return WEAPON_EFFECT_PROFILES[weaponId] || WEAPON_EFFECT_PROFILES.revolver;
}

export function weaponShotAngles(weapon, baseAngle) {
  const count = Math.max(1, weapon.projectiles || 1);
  if (count === 1) return [baseAngle];
  return Array.from({ length: count }, (_, index) => {
    const centered = index / (count - 1) - .5;
    return baseAngle + centered * (weapon.spread || 0) * Math.PI / 180;
  });
}

function track(scene, object, tween) {
  const cap = scene.performance?.vfxCap || 72;
  if ((scene.activeVfx || 0) >= cap) { object.destroy(); return null; }
  scene.activeVfx = (scene.activeVfx || 0) + 1;
  object.once('destroy', () => { scene.activeVfx = Math.max(0, scene.activeVfx - 1); });
  scene.tweens.add({ targets: object, ...tween, onComplete: () => object.destroy() });
  return object;
}

function tracer(scene, x, y, angle, length, width, color, alpha, duration) {
  const line = scene.add.rectangle(x, y, length, width, color, alpha)
    .setOrigin(0, .5).setRotation(angle).setDepth(36).setBlendMode(Phaser.BlendModes.ADD);
  return track(scene, line, {
    alpha: 0, scaleX: 1.14,
    x: x + Math.cos(angle) * 13, y: y + Math.sin(angle) * 13,
    duration, ease: 'Quad.Out',
  });
}

function sparkBurst(scene, x, y, angle, color, count = 4) {
  for (let index = 0; index < count; index += 1) {
    const offset = (index - (count - 1) / 2) * .27;
    const sparkAngle = angle + offset + (index % 2 ? .12 : -.12);
    tracer(scene, x, y, sparkAngle, 9 + index * 2, 1.5, color, .9, 85 + index * 8);
  }
}

function flameBlob(scene, x, y, angle, index, smoke = false) {
  const side = index % 2 ? 1 : -1;
  const color = smoke ? 0x786d68 : [0xfff0a1, 0xffbf46, 0xff6a22][index % 3];
  const blob = scene.add.circle(x, y + side * (2 + index), smoke ? 4.5 : 3.5 + index * .45, color, smoke ? .28 : .88)
    .setDepth(35).setBlendMode(smoke ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
  track(scene, blob, {
    x: x + Math.cos(angle) * (22 + index * 7),
    y: y + Math.sin(angle) * (22 + index * 7) + side * 5,
    alpha: 0, scale: smoke ? 1.8 : .45, duration: smoke ? 190 : 125, ease: 'Quad.Out',
  });
}

export function presentWeaponShot(scene, angle, authoredAngles = null) {
  if (!scene?.player || !scene?.state?.weapon) return;
  const weapon = scene.state.weapon;
  const profile = weaponEffectProfile(weapon.id);
  const x = scene.player.x + Math.cos(angle) * 27;
  const y = scene.player.y + Math.sin(angle) * 27;
  const angles = authoredAngles?.length ? authoredAngles : weaponShotAngles(weapon, angle);
  if (weapon.id === 'shotgun') {
    angles.forEach((shotAngle) => tracer(scene, x, y, shotAngle, profile.tracer, 2.4, profile.color, .92, profile.duration));
  } else if (weapon.id === 'crossbow') {
    tracer(scene, x, y, angle, profile.tracer, 5.5, 0xffd7bd, .16, profile.duration);
    tracer(scene, x, y, angle, profile.tracer, 1.35, profile.color, 1, profile.duration);
  } else if (weapon.id === 'flame') {
    for (let index = 0; index < 4; index += 1) flameBlob(scene, x, y, angle, index);
    flameBlob(scene, x, y, angle, 2, true);
  } else {
    tracer(scene, x, y, angle, profile.tracer, 2.2, profile.color, .95, profile.duration);
    sparkBurst(scene, x + Math.cos(angle) * 7, y + Math.sin(angle) * 7, angle, profile.color, 4);
  }
  triggerShotFeedback(scene, angle);
  scene.weaponAudio?.play(weapon.id);
  scene.cameras.main.shake(60, profile.shake * (scene.performance?.mobile ? 1.18 : 1));
}

export function presentWeaponImpact(scene, bullet, x, y) {
  if (!bullet?.weaponId || !scene?.add?.rectangle) return;
  const profile = weaponEffectProfile(bullet.weaponId);
  const angle = bullet.rotation || 0;
  if (bullet.weaponId === 'flame') {
    for (let index = 0; index < 3; index += 1) flameBlob(scene, x, y, angle + Math.PI, index);
  } else if (bullet.weaponId === 'crossbow') {
    tracer(scene, x - Math.cos(angle) * 13, y - Math.sin(angle) * 13, angle, 34, 1.4, profile.color, .9, 95);
  } else {
    sparkBurst(scene, x, y, angle + Math.PI, profile.color, bullet.weaponId === 'shotgun' ? 3 : 5);
  }
}

export function updateProjectilePresentation(scene, bullet) {
  if (bullet?.weaponId !== 'flame' || scene.time.now < (bullet.nextTrailAt || 0)) return;
  bullet.nextTrailAt = scene.time.now + (scene.performance?.mobile ? 92 : 62);
  const angle = bullet.rotation || 0;
  const x = bullet.x - Math.cos(angle) * 12;
  const y = bullet.y - Math.sin(angle) * 12;
  flameBlob(scene, x, y, angle + Math.PI, 1);
  if (!scene.performance?.mobile) flameBlob(scene, x, y, angle + Math.PI, 1, true);
}
