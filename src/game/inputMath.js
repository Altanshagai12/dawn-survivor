export function isRotatedMobileFallback() {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('mobile-rotated');
}

export function gameVectorFromClient(vector, rotated = false) {
  return rotated ? { x: vector.y, y: -vector.x } : { ...vector };
}

export function surfacePointFromClient(point, surface, rotated = false) {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  if (rotated) {
    return {
      x: (point.clientY - rect.top) * (surface.width / rect.height),
      y: (rect.right - point.clientX) * (surface.height / rect.width),
    };
  }
  return {
    x: (point.clientX - rect.left) * (surface.width / rect.width),
    y: (point.clientY - rect.top) * (surface.height / rect.height),
  };
}

export function aimFromClientPoint(
  point,
  surface,
  camera,
  player,
  fallback = { x: 1, y: 0 },
  rotated = isRotatedMobileFallback(),
) {
  if (!point || !surface || !camera || !player) return { ...fallback };
  const screen = surfacePointFromClient(point, surface, rotated);
  if (!screen) return { ...fallback };
  const world = camera.getWorldPoint(screen.x, screen.y);
  const x = world.x - player.x;
  const y = world.y - player.y;
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < .001) return { ...fallback };
  return { x: x / length, y: y / length };
}

export function radialDeadZone(vector, deadZone = .08) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= deadZone) return { x: 0, y: 0 };
  const magnitude = Math.min(1, (length - deadZone) / (1 - deadZone));
  return { x: vector.x / length * magnitude, y: vector.y / length * magnitude };
}

export function smoothStick(current, target, amount = .42) {
  const x = current.x + (target.x - current.x) * amount;
  const y = current.y + (target.y - current.y) * amount;
  if (Math.hypot(target.x, target.y) < .001 && Math.hypot(x, y) < .025) return { x: 0, y: 0 };
  return { x, y };
}

export function smoothDirection(current, target, amount = .5) {
  const targetLength = Math.hypot(target.x, target.y);
  if (targetLength < .001) return { ...current };
  const x = current.x + (target.x / targetLength - current.x) * amount;
  const y = current.y + (target.y / targetLength - current.y) * amount;
  const length = Math.hypot(x, y);
  if (length < .001) return { x: target.x / targetLength, y: target.y / targetLength };
  return { x: x / length, y: y / length };
}

export function anchoredStickVector(point, origin, travel, rotated = false, deadZone = .08) {
  if (!point || !origin || !Number.isFinite(travel) || travel <= 0) {
    return { raw: { x: 0, y: 0 }, adjusted: { x: 0, y: 0 } };
  }
  let { x, y } = gameVectorFromClient({
    x: (point.clientX - origin.clientX) / travel,
    y: (point.clientY - origin.clientY) / travel,
  }, rotated);
  const length = Math.hypot(x, y) || 1;
  if (length > 1) { x /= length; y /= length; }
  return { raw: { x, y }, adjusted: radialDeadZone({ x, y }, deadZone) };
}

export function stickOriginOffset(point, rect, rotated = false) {
  return gameVectorFromClient({
    x: point.clientX - (rect.left + rect.width / 2),
    y: point.clientY - (rect.top + rect.height / 2),
  }, rotated);
}

