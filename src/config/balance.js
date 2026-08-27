export const WORLD_UNIT = 36;

export const TEN_MINUTES_BALANCE = {
  player: {
    baseRunSpeed: 5 * WORLD_UNIT,
    shootWalkRatio: 0.5,
    hitIFramesMs: 500,
    hina: {
      dashDistance: 4 * WORLD_UNIT,
      dashDuration: 0.16,
      cooldown: 2,
      cloneDuration: 4,
      cloneAttackInterval: 0.65,
      cloneRange: 7 * WORLD_UNIT,
    },
  },
  enemy: {
    // Contact enemies stay just below the player's 50% firing-walk speed so
    // careful twin-stick kiting remains possible. Density supplies the ramp.
    tentacle: { speedRatio: 0.40 },
    boomer: { speedRatio: 0.46, explosionDamage: 1, blastRadius: 112, windupMs: 700 },
    eye: { speedRatio: 0.34, preferredRange: 7 * WORLD_UNIT, projectileSpeed: 2.7 * WORLD_UNIT },
    elder: { speedRatio: 0.42 },
    shub: { speedRatio: 0.47, chargeRatio: 2.6, telegraphMs: 900, chargeMs: 700 },
  },
  barrier: {
    startWidth: 18 * WORLD_UNIT,
    startHeight: 12 * WORLD_UNIT,
    endWidth: 13 * WORLD_UNIT,
    endHeight: 9 * WORLD_UNIT,
    startViewportWidthRatio: 0.9,
    startViewportHeightRatio: 0.86,
    endViewportWidthRatio: 0.72,
    endViewportHeightRatio: 0.68,
    shrinkSeconds: 60,
    bounceDistance: 0.8 * WORLD_UNIT,
    bounceSpeed: 8 * WORLD_UNIT,
    bounceMs: 220,
  },
  spawning: {
    minOutsideMargin: 1 * WORLD_UNIT,
    maxOutsideMargin: 3 * WORLD_UNIT,
    retries: 8,
  },
  environment: {
    chunkSize: 24 * WORLD_UNIT,
    minTreesPerChunk: 1,
    maxTreesPerChunk: 3,
    minTreeSeparation: 9 * WORLD_UNIT,
    playerSafeRadius: 12 * WORLD_UNIT,
    treeColliderRadius: 0.65 * WORLD_UNIT,
    treeHp: 45000,
  },
};

export const SPAWN_SESSIONS = [
  { id: 'tentacle-0', enemyId: 'tentacle', from: 0, to: 60, hp: 24, maxAlive: 20, count: 4, interval: 3 },
  { id: 'tentacle-1', enemyId: 'tentacle', from: 60, to: 120, hp: 24, maxAlive: 50, count: 10, interval: 4 },
  { id: 'boomer-1', enemyId: 'boomer', from: 60, to: 120, hp: 30, maxAlive: 2, count: 1, interval: 4 },
  { id: 'tentacle-2', enemyId: 'tentacle', from: 120, to: 360, hp: 30, maxAlive: 200, count: 7, interval: 2 },
  { id: 'boomer-2', enemyId: 'boomer', from: 120, to: 360, hp: 30, maxAlive: 10, count: 2, interval: 5 },
  { id: 'tentacle-3', enemyId: 'tentacle', from: 360, to: 480, hp: 60, maxAlive: 400, count: 12, interval: 2 },
  { id: 'eye-3', enemyId: 'eye', from: 360, to: 480, hp: 400, maxAlive: 2, count: 2, interval: 10 },
  { id: 'boomer-4', enemyId: 'boomer', from: 420, to: 540, hp: 60, maxAlive: 1, count: 1, interval: 1 },
  { id: 'tentacle-final', enemyId: 'tentacle', from: 480, to: 600, hp: 100, maxAlive: 600, count: 16, interval: 1 },
];
