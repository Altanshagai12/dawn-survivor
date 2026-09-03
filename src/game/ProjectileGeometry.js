export const PROJECTILE_RENDER_MULTIPLIER = 1.9;

export function projectileScale(size = 7) {
  return size / 8 * PROJECTILE_RENDER_MULTIPLIER;
}

export function projectileCollisionRadius(size = 7) {
  return size / 2;
}

export function usesSweptProjectileCollision(weaponId) {
  return Boolean(weaponId);
}

export function syncProjectileVisualRotation(bullet, trajectoryAngle) {
  bullet.trajectoryAngle = trajectoryAngle;
  bullet.setRotation(trajectoryAngle + (bullet.visualRotationOffset || 0));
  return bullet.rotation;
}

export function visibleProjectileCollisionRadius(
  size = 7,
) {
  return projectileCollisionRadius(size);
}

export function projectileBodyGeometry({
  size = 7,
  renderScale = projectileScale(size),
  frameWidth = 0,
  frameHeight = frameWidth,
  originX = .5,
  originY = .5,
} = {}) {
  const safeScale = Math.max(.001, Math.abs(renderScale));
  const worldRadius = projectileCollisionRadius(size);
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
