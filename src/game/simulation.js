import { RUN_SECONDS } from '../data/enemies.js';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function xpRequired(level) {
  if (level <= 19) return 10 * level - 5;
  return Math.round(13 * level - 25);
}

export function directionRowFromVector(x, y) {
  if (Math.abs(x) + Math.abs(y) < .001) return 4;
  const octant = Math.round((Math.atan2(y, x) + Math.PI / 2) / (Math.PI / 4));
  return ((octant % 8) + 8) % 8;
}

export function spawnInterval(elapsed) {
  const progress = clamp(elapsed / RUN_SECONDS, 0, 1);
  const wavePulse = 1 - .14 * Math.sin(elapsed * .11);
  return clamp((.72 - progress * .57) * wavePulse, .12, .8);
}

export function enemyHealthScale(elapsed) {
  const progress = clamp(elapsed / RUN_SECONDS, 0, 1);
  return 1 + progress * 2.1 + Math.max(0, elapsed - 420) * .006;
}

export function weightedPick(items, random = Math.random) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight || 0), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight || 0);
    if (roll <= 0) return item;
  }
  return items.at(-1);
}

export function sampleWithoutReplacement(items, count, random = Math.random) {
  const pool = [...items];
  const selected = [];
  while (pool.length && selected.length < count) {
    const index = Math.floor(random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

export function scoreForRun({ kills, bosses, level, elapsed, won }) {
  const survival = Math.floor(Math.min(elapsed, RUN_SECONDS) * 8);
  return Math.max(0, Math.round(kills * 12 + bosses * 1200 + level * 90 + survival + (won ? 5000 : 0)));
}
