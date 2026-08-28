import { triggerShotFeedback } from './PlayerFeedback.js?build=20260826f';

export const WEAPON_EFFECT_PROFILES = Object.freeze({
  revolver: Object.freeze({ color: 0xffead8, tracer: 60, shake: .00105, duration: 105, visualScale: 1.4 }),
  shotgun: Object.freeze({ color: 0xffe2c8, tracer: 54, shake: .0017, duration: 120, visualScale: 1.34 }),
  crossbow: Object.freeze({ color: 0xfff1df, tracer: 170, shake: .0008, duration: 140, visualScale: 1.46 }),
  flame: Object.freeze({ color: 0xffa13d, tracer: 42, shake: .0012, duration: 165, visualScale: 1.52 }),
});

export function weaponEffectProfile(weaponId, skin = null) {
  const base = WEAPON_EFFECT_PROFILES[weaponId] || WEAPON_EFFECT_PROFILES.revolver;
  if (!skin) return base;
  return {
    ...base,
    color: weaponId === 'flame' ? skin.secondary : weaponId === 'crossbow' ? skin.impact : skin.primary,
    accent: skin.secondary,
    visualScale: base.visualScale * 1.16,
    duration: base.duration * 1.08,
    motif: skin.motif,
  };
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

function pulse(scene, x, y, color, scale = 1) {
  const glow = scene.add.circle(x, y, 7 * scale, color, .38)
    .setDepth(35).setBlendMode(Phaser.BlendModes.ADD);
  return track(scene, glow, {
    alpha: 0, scale: 2.15, duration: 115, ease: 'Quad.Out',
  });
}

function sparkBurst(scene, x, y, angle, color, count = 4, scale = 1) {
  for (let index = 0; index < count; index += 1) {
    const offset = (index - (count - 1) / 2) * .27;
    const sparkAngle = angle + offset + (index % 2 ? .12 : -.12);
    tracer(scene, x, y, sparkAngle, (9 + index * 2) * scale, 1.5 * scale, color, .9, 85 + index * 8);
  }
}

function flameBlob(scene, x, y, angle, index, smoke = false, scale = 1) {
  const side = index % 2 ? 1 : -1;
  const color = smoke ? 0x786d68 : [0xfff0a1, 0xffbf46, 0xff6a22][index % 3];
  const radius = (smoke ? 4.5 : 3.5 + index * .45) * scale;
  const blob = scene.add.circle(x, y + side * (2 + index), radius, color, smoke ? .28 : .88)
    .setDepth(35).setBlendMode(smoke ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
  track(scene, blob, {
    x: x + Math.cos(angle) * (22 + index * 7),
    y: y + Math.sin(angle) * (22 + index * 7) + side * 5,
    alpha: 0, scale: smoke ? 1.8 : .45, duration: smoke ? 190 : 125, ease: 'Quad.Out',
  });
}

function premiumMotif(scene, x, y, angle, skin, impact = false) {
  if (!skin) return;
  const count = skin.motif === 'moon' ? 3 : skin.motif === 'star' ? 6 : 5;
  for (let index = 0; index < count; index += 1) {
    const offset = (index - (count - 1) / 2) * .28;
    const petalAngle = angle + offset + (impact ? Math.PI : 0);
    const length = (skin.motif === 'feather' ? 15 : skin.motif === 'lotus' ? 11 : 9) * (impact ? 1.22 : 1);
    const mote = scene.add.ellipse(x, y, length, skin.motif === 'moon' ? 3 : 2, index % 2 ? skin.secondary : skin.primary, .85)
      .setRotation(petalAngle).setDepth(37).setBlendMode(Phaser.BlendModes.ADD);
    track(scene, mote, {
      x: x + Math.cos(petalAngle) * (impact ? 30 : 22),
      y: y + Math.sin(petalAngle) * (impact ? 30 : 22),
      alpha: 0, scaleX: 1.5, scaleY: .35, duration: 135 + index * 10, ease: 'Quad.Out',
    });
  }
}

export function presentWeaponShot(scene, angle, authoredAngles = null) {
  if (!scene?.player || !scene?.state?.weapon) return;
  const weapon = scene.state.weapon;
  const skin = scene.state.skin;
  const profile = weaponEffectProfile(weapon.id, skin);
  const x = scene.player.x + Math.cos(angle) * 27;
  const y = scene.player.y + Math.sin(angle) * 27;
  const angles = authoredAngles?.length ? authoredAngles : weaponShotAngles(weapon, angle);
  scene.premiumVfx?.shot(angle, angles);
  if (skin) {
    triggerShotFeedback(scene, angle);
    scene.weaponAudio?.play(weapon.id, skin, scene.state);
    scene.cameras.main.shake(60, profile.shake * (scene.performance?.mobile ? 1.18 : 1));
    return;
  }
  pulse(scene, x, y, profile.color, profile.visualScale * .8);
  if (weapon.id === 'shotgun') {
    angles.forEach((shotAngle) => tracer(scene, x, y, shotAngle, profile.tracer,
      2.4 * profile.visualScale, profile.color, .92, profile.duration));
  } else if (weapon.id === 'crossbow') {
    tracer(scene, x, y, angle, profile.tracer, 5.5 * profile.visualScale, 0xffd7bd, .2, profile.duration);
    tracer(scene, x, y, angle, profile.tracer, 1.35 * profile.visualScale, profile.color, 1, profile.duration);
  } else if (weapon.id === 'flame') {
    for (let index = 0; index < 4; index += 1) flameBlob(scene, x, y, angle, index, false, profile.visualScale);
    flameBlob(scene, x, y, angle, 2, true, profile.visualScale);
  } else {
    tracer(scene, x, y, angle, profile.tracer, 2.2 * profile.visualScale, profile.color, .95, profile.duration);
    sparkBurst(scene, x + Math.cos(angle) * 7, y + Math.sin(angle) * 7,
      angle, profile.color, 4, profile.visualScale);
  }
  premiumMotif(scene, x, y, angle, skin);
  triggerShotFeedback(scene, angle);
  scene.weaponAudio?.play(weapon.id, skin, scene.state);
  scene.cameras.main.shake(60, profile.shake * (scene.performance?.mobile ? 1.18 : 1));
}

export function presentWeaponImpact(scene, bullet, x, y) {
  if (!bullet?.weaponId || !scene?.add?.rectangle) return;
  const skin = bullet.skin || null;
  const profile = weaponEffectProfile(bullet.weaponId, skin);
  const angle = bullet.rotation || 0;
  scene.premiumVfx?.impact(bullet, x, y);
  scene.weaponAudio?.playImpact?.(bullet, scene.state);
  if (skin) return;
  pulse(scene, x, y, profile.color, profile.visualScale);
  if (bullet.weaponId === 'flame') {
    for (let index = 0; index < 3; index += 1) {
      flameBlob(scene, x, y, angle + Math.PI, index, false, profile.visualScale);
    }
  } else if (bullet.weaponId === 'crossbow') {
    tracer(scene, x - Math.cos(angle) * 13, y - Math.sin(angle) * 13, angle,
      42 * profile.visualScale, 1.4 * profile.visualScale, profile.color, .95, 110);
  } else {
    sparkBurst(scene, x, y, angle + Math.PI, profile.color,
      bullet.weaponId === 'shotgun' ? 4 : 6, profile.visualScale);
  }
  premiumMotif(scene, x, y, angle, skin, true);
}

export function updateProjectilePresentation(scene, bullet) {
  scene.premiumVfx?.trail(bullet);
  if (bullet?.skin) return;
  if (bullet?.weaponId !== 'flame' || scene.time.now < (bullet.nextTrailAt || 0)) return;
  bullet.nextTrailAt = scene.time.now + (scene.performance?.mobile ? 92 : 62);
  const angle = bullet.rotation || 0;
  const x = bullet.x - Math.cos(angle) * 12;
  const y = bullet.y - Math.sin(angle) * 12;
  const scale = weaponEffectProfile('flame', bullet.skin || null).visualScale;
  flameBlob(scene, x, y, angle + Math.PI, 1, false, scale);
  if (!scene.performance?.mobile) flameBlob(scene, x, y, angle + Math.PI, 1, true, scale);
}
