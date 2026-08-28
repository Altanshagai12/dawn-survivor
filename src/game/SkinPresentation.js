function blendColor(from, to, amount) {
  const mix = (shift) => Math.round(((from >> shift) & 255) * (1 - amount) + ((to >> shift) & 255) * amount);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

const WEAPON_FRAMES = Object.freeze({ revolver: 1, shotgun: 2, crossbow: 3, flame: 4 });

export function applyHeroSkin(scene) {
  const skin = scene?.state?.skin;
  if (!scene?.player || !skin) return null;
  scene.player.setTint(skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  const crest = scene.add.image(scene.player.x, scene.player.y, skin.vfxKey, 15)
    .setDepth(26).setScale(.072).setAlpha(.34).setBlendMode(Phaser.BlendModes.ADD);
  const weapon = scene.add.image(scene.player.x, scene.player.y, skin.vfxKey,
    WEAPON_FRAMES[scene.state.weapon.id] ?? 1)
    .setDepth(32).setScale(.07).setAlpha(.62).setBlendMode(Phaser.BlendModes.ADD);
  return { scene, skin, crest, weapon, phase: 0 };
}

export function restoreHeroSkin(scene) {
  if (!scene?.player?.active) return;
  if (scene.state?.skin) scene.player.setTint(scene.state.skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  else scene.player.clearTint();
}

export function syncHeroSkin(aura, player, deltaSeconds = 0) {
  if (!aura || !player?.active) return;
  aura.phase += deltaSeconds * 2.4;
  const shimmer = .08 + (Math.sin(aura.phase * 1.7) + 1) * .035;
  player.setTint(blendColor(aura.skin.spriteTint, aura.skin.primary, shimmer));
  const facing = aura.scene.facing || { x: 0, y: 1 };
  const angle = Math.atan2(facing.y, facing.x);
  aura.crest.setPosition(player.x, player.y - 2).setRotation(-angle * .18)
    .setScale(.07 + Math.sin(aura.phase * 2.1) * .005);
  aura.weapon.setPosition(player.x + facing.x * 19, player.y + facing.y * 15 - 2)
    .setRotation(angle).setScale(.066 + Math.sin(aura.phase * 2.8) * .004);
}

export function destroyHeroSkin(aura) {
  aura?.crest?.destroy();
  aura?.weapon?.destroy();
}
