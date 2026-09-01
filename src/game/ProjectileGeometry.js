export const PROJECTILE_RENDER_MULTIPLIER = 1.9;
export const PREMIUM_PROJECTILE_CORE_RATIO = .3;

export function projectileScale(size = 7) {
  return size / 8 * PROJECTILE_RENDER_MULTIPLIER;
}

export function projectileCollisionRadius(size = 7) {
  return size / 2;
}

export function usesSweptProjectileCollision(weaponId) {
  return Boolean(weaponId);
}

export function visibleProjectileCollisionRadius(
  size = 7,
  renderScale = projectileScale(size),
  frameWidth = 0,
  frameHeight = frameWidth,
  visualCoreRatio = 0,
) {
  const authoredRadius = projectileCollisionRadius(size);
  if (!visualCoreRatio || !frameWidth || !frameHeight) return authoredRadius;
  const visibleRadius = Math.min(frameWidth, frameHeight)
    * Math.abs(renderScale) * visualCoreRatio;
  return Math.max(authoredRadius, visibleRadius);
}

export function projectileBodyGeometry({
  size = 7,
  renderScale = projectileScale(size),
  frameWidth = 0,
  frameHeight = frameWidth,
  originX = .5,
  originY = .5,
  visualCoreRatio = 0,
} = {}) {
  const safeScale = Math.max(.001, Math.abs(renderScale));
  const worldRadius = visibleProjectileCollisionRadius(
    size, safeScale, frameWidth, frameHeight, visualCoreRatio,
  );
  const localRadius = worldRadius / safeScale;
  return {
    worldRadius,
    localRadius,
    offsetX: frameWidth * originX - localRadius,
    offsetY: frameHeight * originY - localRadius,
  };
}

export function projectileBodyRadius(size = 7, renderScale = projectileScale(size)) {
  return projectileCollisionRadius(size) / Math.max(.001, Math.abs(renderScale));
}
