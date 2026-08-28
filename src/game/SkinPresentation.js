export function applyHeroSkin(scene) {
  const skin = scene?.state?.skin;
  if (!scene?.player || !skin) return null;
  scene.player.setTint(skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  const inner = scene.add.circle(scene.player.x, scene.player.y + 15, 24, skin.primary, .13)
    .setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
  const ring = scene.add.circle(scene.player.x, scene.player.y + 15, 30, skin.secondary, .12)
    .setStrokeStyle(1.4, skin.secondary, .48).setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
  const mote = scene.add.rectangle(scene.player.x, scene.player.y, 5, 2, skin.impact, .78)
    .setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
  return { skin, inner, ring, mote, phase: 0 };
}

export function restoreHeroSkin(scene) {
  if (!scene?.player?.active) return;
  if (scene.state?.skin) scene.player.setTint(scene.state.skin.spriteTint).setTintMode(Phaser.TintModes.MULTIPLY);
  else scene.player.clearTint();
}

export function syncHeroSkin(aura, player, deltaSeconds = 0) {
  if (!aura || !player?.active) return;
  aura.phase += deltaSeconds * 2.4;
  const footY = player.y + player.displayHeight * .25;
  aura.inner.setPosition(player.x, footY).setScale(.94 + Math.sin(aura.phase) * .08);
  aura.ring.setPosition(player.x, footY).setScale(1 + Math.cos(aura.phase * .8) * .05).setRotation(aura.phase * .35);
  const orbit = 29;
  aura.mote.setPosition(player.x + Math.cos(aura.phase) * orbit, footY + Math.sin(aura.phase) * orbit * .38)
    .setRotation(aura.phase + Math.PI / 2);
}

export function destroyHeroSkin(aura) {
  if (!aura) return;
  aura.inner?.destroy();
  aura.ring?.destroy();
  aura.mote?.destroy();
}
