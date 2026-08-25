export const ENEMIES = {
  creeper: { id: 'creeper', name: 'Creeper', hp: 24, speed: 48, damage: 1, xp: 1, radius: 20, size: 54, unlockAt: 0, weight: 12, score: 10 },
  crawler: { id: 'crawler', name: 'Crawler', hp: 38, speed: 62, damage: 1, xp: 1, radius: 21, size: 58, unlockAt: 35, weight: 9, score: 14 },
  wingling: { id: 'wingling', name: 'Wingling', hp: 20, speed: 92, damage: 1, xp: 1, radius: 17, size: 48, unlockAt: 70, weight: 7, score: 16 },
  spitter: { id: 'spitter', name: 'Spitter', hp: 52, speed: 42, damage: 1, xp: 2, radius: 22, size: 56, unlockAt: 120, weight: 6, score: 22, ranged: true },
  bomber: { id: 'bomber', name: 'Bomber', hp: 88, speed: 54, damage: 2, xp: 3, radius: 24, size: 62, unlockAt: 180, weight: 5, score: 30, bomber: true },
  charger: { id: 'charger', name: 'Charger', hp: 125, speed: 58, damage: 2, xp: 4, radius: 26, size: 68, unlockAt: 250, weight: 4, score: 42, charger: true },
  splitter: { id: 'splitter', name: 'Splitter', hp: 170, speed: 40, damage: 2, xp: 5, radius: 27, size: 68, unlockAt: 320, weight: 3, score: 55, splits: true },
  brute: { id: 'brute', name: 'Brute', hp: 360, speed: 30, damage: 2, xp: 8, radius: 31, size: 78, unlockAt: 390, weight: 2, score: 90 },
};

export const BOSSES = {
  'hollow-stag': { id: 'hollow-stag', name: 'Hollow Stag', spawnAt: 120, hp: 1400, speed: 56, damage: 2, radius: 46, size: 112, score: 900, pattern: 'charge' },
  'bell-warden': { id: 'bell-warden', name: 'Bell Warden', spawnAt: 300, hp: 2700, speed: 34, damage: 2, radius: 52, size: 126, score: 1800, pattern: 'rings' },
  'eclipse-mother': { id: 'eclipse-mother', name: 'Eclipse Mother', spawnAt: 540, hp: 4200, speed: 40, damage: 2, radius: 58, size: 138, score: 3200, pattern: 'summon' },
};

export const RUN_SECONDS = 600;
export const MAX_LIVE_ENEMIES = 135;

export function availableEnemies(elapsed) {
  return Object.values(ENEMIES).filter((enemy) => elapsed >= enemy.unlockAt);
}
