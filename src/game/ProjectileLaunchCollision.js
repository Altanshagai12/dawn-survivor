export function launchSegmentHit(fromX, fromY, toX, toY, targetX, targetY, radius) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const lengthSquared = dx * dx + dy * dy;
  const rawProjection = lengthSquared > 0
    ? ((targetX - fromX) * dx + (targetY - fromY) * dy) / lengthSquared
    : 0;
  const projection = Math.max(0, Math.min(1, rawProjection));
  const closestX = fromX + dx * projection;
  const closestY = fromY + dy * projection;
  const distanceSquared = (targetX - closestX) ** 2 + (targetY - closestY) ** 2;
  return { hit: distanceSquared <= radius ** 2, projection };
}

export function resolveProjectileSegmentHits(combat, bullet, fromX, fromY, toX, toY) {
  const candidates = [];
  (combat.scene.enemies?.getChildren?.() || []).forEach((enemy) => {
    if (!enemy?.active || enemy.dying) return;
    const enemyRadius = Number(enemy.enemyDef?.radius || enemy.body?.radius || 16);
    const intersection = launchSegmentHit(
      fromX, fromY, toX, toY, enemy.x, enemy.y,
      enemyRadius + (bullet.collisionRadius || 0),
    );
    if (intersection.hit) candidates.push({ enemy, projection: intersection.projection });
  });
  candidates.sort((a, b) => a.projection - b.projection);
  const trajectoryRevision = Number(bullet.trajectoryRevision || 0);
  for (const { enemy } of candidates) {
    if (!bullet.active) break;
    combat.hitEnemy(bullet, enemy);
    if (Number(bullet.trajectoryRevision || 0) !== trajectoryRevision) break;
  }
}

export function resolveProjectileLaunchHits(combat, bullet, fromX, fromY, toX, toY) {
  resolveProjectileSegmentHits(combat, bullet, fromX, fromY, toX, toY);
}

export function resolveProjectileTravelHits(combat, bullet, fromX, fromY, toX, toY) {
  resolveProjectileSegmentHits(combat, bullet, fromX, fromY, toX, toY);
}
