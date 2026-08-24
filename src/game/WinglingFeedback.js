export function isInsideView(view, x, y, inset = 18) {
  return x >= view.left + inset && x <= view.right - inset
    && y >= view.top + inset && y <= view.bottom - inset;
}

export function edgeWarningPosition(view, x, y, inset = 48) {
  const dx = x - view.centerX;
  const dy = y - view.centerY;
  const halfWidth = Math.max(1, view.width / 2 - inset);
  const halfHeight = Math.max(1, view.height / 2 - inset);
  const scale = Math.min(1, halfWidth / Math.max(.001, Math.abs(dx)), halfHeight / Math.max(.001, Math.abs(dy)));
  return { x: view.centerX + dx * scale, y: view.centerY + dy * scale };
}

export function attachWinglingFeedback(scene, enemy) {
  enemy.winglingGlow = scene.add.image(enemy.x, enemy.y, 'wingling-glow')
    .setDepth(enemy.depth - .2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.42);
  enemy.winglingTrail = scene.add.image(enemy.x, enemy.y, 'wingling-trail')
    .setDepth(enemy.depth - .3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  enemy.once('destroy', () => {
    enemy.winglingGlow?.destroy();
    enemy.winglingTrail?.destroy();
    enemy.spawnWarning?.destroy();
  });
}

export function syncWinglingFeedback(enemy, now) {
  const glow = enemy.winglingGlow;
  const trail = enemy.winglingTrail;
  if (!glow?.active || !trail?.active) return;
  const velocity = enemy.body?.velocity || { x: 0, y: 0 };
  const speed = Math.hypot(velocity.x, velocity.y);
  const nx = speed > 1 ? velocity.x / speed : 0;
  const ny = speed > 1 ? velocity.y / speed : 0;
  glow.setPosition(enemy.x, enemy.y - 1)
    .setDisplaySize(enemy.displayWidth * 1.45, enemy.displayHeight * 1.38)
    .setAlpha(.34 + Math.sin(now * .012) * .08);
  trail.setVisible(speed > 20)
    .setPosition(enemy.x - nx * enemy.displayWidth * .48, enemy.y - ny * enemy.displayHeight * .48)
    .setRotation(Math.atan2(ny, nx))
    .setDisplaySize(enemy.displayWidth * 1.2, Math.max(12, enemy.displayHeight * .42))
    .setAlpha(.25 + Math.sin(now * .018) * .06);
}

export function syncWinglingWarning(enemy, camera, now) {
  const warning = enemy.spawnWarning;
  if (!warning?.active) return false;
  const view = camera.worldView;
  if (now >= enemy.spawnReadyAt && isInsideView(view, enemy.x, enemy.y)) {
    warning.destroy();
    enemy.spawnWarning = null;
    return false;
  }
  const point = edgeWarningPosition(view, enemy.x, enemy.y);
  warning.setPosition(point.x, point.y);
  return true;
}
