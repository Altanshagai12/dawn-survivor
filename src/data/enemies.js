import { SPAWN_SESSIONS, TEN_MINUTES_BALANCE } from '../config/balance.js';

const baseSpeed = TEN_MINUTES_BALANCE.player.baseRunSpeed;

export const ENEMIES = {
  tentacle: {
    id: 'tentacle', name: 'Tentacle', hp: 24,
    speed: baseSpeed * TEN_MINUTES_BALANCE.enemy.tentacle.speedRatio,
    damage: 1, xp: 1, radius: 20, size: 54, score: 10,
  },
  boomer: {
    id: 'boomer', name: 'Boomer', hp: 30,
    speed: baseSpeed * TEN_MINUTES_BALANCE.enemy.boomer.speedRatio,
    damage: 1, xp: 2, radius: 24, size: 62, score: 30, boomer: true,
  },
  eye: {
    id: 'eye', name: 'Eye', hp: 400,
    speed: baseSpeed * TEN_MINUTES_BALANCE.enemy.eye.speedRatio,
    damage: 1, xp: 4, radius: 22, size: 56, score: 90, ranged: true,
  },
};

export const BOSSES = {
  elder: {
    id: 'elder', name: 'Elder', spawnAt: 180, hp: 1000,
    speed: baseSpeed * TEN_MINUTES_BALANCE.enemy.elder.speedRatio,
    damage: 1, radius: 50, size: 132, score: 1000, pattern: 'elder', rewardType: 'chest',
  },
  shub: {
    id: 'shub', name: 'Shub-Niggurath', spawnAt: 300, hp: 2500,
    speed: baseSpeed * TEN_MINUTES_BALANCE.enemy.shub.speedRatio,
    damage: 1, radius: 55, size: 140, score: 2500, pattern: 'shub', rewardType: 'tome',
  },
};

export const RUN_SECONDS = 600;
export const MAX_LIVE_ENEMIES = 620;
export const ENEMY_SPAWN_SESSIONS = SPAWN_SESSIONS;
