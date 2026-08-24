export function upgradedProjectileCount(base, added = 0, fusillade = false) {
  const count = base * (fusillade ? 2 : 1) + added;
  return Math.min(18, Math.max(1, Math.round(count)));
}

export function shouldConsumeAmmo({ free = false, siege = false, moving = false, roll = Math.random() } = {}) {
  if (free) return false;
  return !(siege && !moving && roll < .4);
}
