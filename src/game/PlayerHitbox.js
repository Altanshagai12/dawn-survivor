export const ORIGINAL_PLAYER_HITBOX = Object.freeze({
  width: 0.15607839822769165,
  height: 0.5386558771133423,
  offsetX: 0.0034401267766952515,
  offsetY: -0.014275729656219482,
});

export const PLAYER_DISPLAY_HEIGHT = 78;
export const PREMIUM_PLAYER_SCREEN_HEIGHT = 72;

export function premiumPlayerDisplayHeight(cameraZoom = 1) {
  const zoom = Number.isFinite(cameraZoom) && cameraZoom > 0 ? cameraZoom : 1;
  return Math.max(PLAYER_DISPLAY_HEIGHT, PREMIUM_PLAYER_SCREEN_HEIGHT / zoom);
}

export function characterSizeScale(mods = {}) {
  return Math.max(0.1, 1 + (mods.playerSizeMul || 0));
}

export function playerHitboxGeometry(displayHeight = PLAYER_DISPLAY_HEIGHT, sizeScale = 1) {
  const scale = Math.max(0.1, sizeScale);
  return {
    width: displayHeight * ORIGINAL_PLAYER_HITBOX.width * scale,
    height: displayHeight * ORIGINAL_PLAYER_HITBOX.height * scale,
    offsetX: displayHeight * ORIGINAL_PLAYER_HITBOX.offsetX * scale,
    offsetY: -displayHeight * ORIGINAL_PLAYER_HITBOX.offsetY * scale,
  };
}

export function applyOriginalPlayerHitbox(sprite, atlas, baseScale, sizeScale = 1) {
  const base = playerHitboxGeometry(PLAYER_DISPLAY_HEIGHT, 1);
  const sourceWidth = base.width / baseScale;
  const sourceHeight = base.height / baseScale;
  const sourceOffsetX = base.offsetX / baseScale;
  const sourceOffsetY = base.offsetY / baseScale;
  const scale = baseScale * Math.max(0.1, sizeScale);

  sprite.setScale(scale);
  sprite.body.setSize(sourceWidth, sourceHeight, false);
  sprite.body.setOffset(
    (atlas.frameWidth - sourceWidth) / 2 + sourceOffsetX,
    (atlas.frameHeight - sourceHeight) / 2 + sourceOffsetY,
  );
  return playerHitboxGeometry(PLAYER_DISPLAY_HEIGHT, sizeScale);
}
