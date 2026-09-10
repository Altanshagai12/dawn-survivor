export const CHARGING_BOSS_KNOCKBACK_RATIO = .1;

export function isBossCharging(enemy, now) {
  return enemy.enemyDef?.id === 'shub' && enemy.chargeUntil > now;
}

export function enemyKnockbackRatio(enemy, now) {
  return isBossCharging(enemy, now) ? CHARGING_BOSS_KNOCKBACK_RATIO : 1;
}
