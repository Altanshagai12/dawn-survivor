function blendColor(from, to, amount) {
  const mix = (shift) => Math.round(((from >> shift) & 255) * (1 - amount) + ((to >> shift) & 255) * amount);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export function applyHeroSkin(scene) {
  const skin = scene?.state?.skin;
  if (!scene?.player || !skin) return null;
  const authoredHero = scene.playerAtlas?.key === skin.heroAtlas?.key;
  if (authoredHero) scene.player.clearTint();
  else scene.player.setTint(skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  const silhouette = scene.add.sprite(
    scene.player.x, scene.player.y, scene.player.texture.key, scene.player.frame.name,
  ).setDepth(24.5).setTint(skin.primary).setAlpha(.11).setBlendMode(Phaser.BlendModes.ADD);
  const backSigil = scene.add.image(scene.player.x, scene.player.y, skin.vfxKey, 0)
    .setDepth(23).setScale(.13).setAlpha(.14).setBlendMode(Phaser.BlendModes.ADD);
  const orbitals = [0, 1].map((index) => scene.add.circle(
    scene.player.x, scene.player.y, 1.55 + index * .18,
    index === 1 ? skin.secondary : skin.primary, .9,
  ).setStrokeStyle(.7, skin.impact, .8).setDepth(27).setBlendMode(Phaser.BlendModes.ADD));
  const weapon = scene.add.image(scene.player.x, scene.player.y, scene.skinWeaponKey)
    .setDepth(32).setScale(.075).setAlpha(.96);
  return {
    scene, skin, authoredHero, silhouette, backSigil, orbitals, weapon,
    phase: 0, visibility: 1,
  };
}

export function restoreHeroSkin(scene) {
  if (!scene?.player?.active) return;
  if (scene.state?.skin?.heroAtlas?.key === scene.playerAtlas?.key) scene.player.clearTint();
  else if (scene.state?.skin) scene.player.setTint(scene.state.skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  else scene.player.clearTint();
}

export function setHeroSkinVisibility(aura, multiplier = 1) {
  if (!aura) return;
  aura.visibility = Math.max(0, Math.min(1, multiplier));
  aura.silhouette?.setAlpha(.11 * aura.visibility);
  aura.backSigil?.setAlpha(.14 * aura.visibility);
  aura.orbitals?.forEach((orbital) => orbital.setAlpha(.58 * aura.visibility));
  aura.weapon?.setAlpha(.96 * aura.visibility);
}

export function syncHeroSkin(aura, player, deltaSeconds = 0) {
  if (!aura || !player?.active) return;
  aura.phase += deltaSeconds * 2.4;
  const shimmer = .08 + (Math.sin(aura.phase * 1.7) + 1) * .035;
  if (!aura.authoredHero) player.setTint(blendColor(aura.skin.spriteTint, aura.skin.primary, shimmer));
  const facing = aura.scene.facing || { x: 0, y: 1 };
  const angle = Math.atan2(facing.y, facing.x);
  const rimPulse = 1.045 + Math.sin(aura.phase * 2.2) * .012;
  aura.silhouette.setTexture(player.texture.key, player.frame.name)
    .setPosition(player.x, player.y).setFlipX(player.flipX)
    .setScale(player.scaleX * rimPulse, player.scaleY * rimPulse)
    .setAlpha((.08 + Math.sin(aura.phase * 2.4) * .025) * aura.visibility);
  aura.backSigil.setPosition(player.x, player.y + 1).setRotation(aura.phase * .12)
    .setScale(.125 + Math.sin(aura.phase * 1.3) * .006)
    .setAlpha((.11 + Math.sin(aura.phase * 1.15) * .025) * aura.visibility);
  aura.orbitals.forEach((orbital, index) => {
    const orbitalAngle = aura.phase * (.72 + index * .11) + index * Math.PI;
    const front = Math.sin(orbitalAngle) > 0;
    orbital.setPosition(
      player.x + Math.cos(orbitalAngle) * (29 + index * 3),
      player.y - 3 + Math.sin(orbitalAngle) * (10 + index * 1.5),
    ).setDepth(front ? 27 : 22.5)
      .setScale(.82 + Math.sin(orbitalAngle * 1.7) * .16)
      .setAlpha((.3 + (front ? .16 : .04)) * aura.visibility);
  });
  aura.weapon.setPosition(player.x + facing.x * 19, player.y + facing.y * 15 - 2)
    .setDepth(facing.y < -.2 ? 24 : 32).setFlipY(facing.x < 0)
    .setRotation(angle).setScale(.074 + Math.sin(aura.phase * 2.8) * .002);
}

export function destroyHeroSkin(aura) {
  aura?.silhouette?.destroy();
  aura?.backSigil?.destroy();
  aura?.orbitals?.forEach((orbital) => orbital.destroy());
  aura?.weapon?.destroy();
}
