const base = './assets';

export const HERO_ATLASES = {
  shana: { key: 'hero-shana', file: `${base}/sprites/heroes/hero-nyra-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  diamond: { key: 'hero-diamond', file: `${base}/sprites/heroes/hero-varka-move-8dir-6f-atlas-isolated.webp`, frameWidth: 222, frameHeight: 148 },
  scarlett: { key: 'hero-scarlett', file: `${base}/sprites/heroes/hero-sola-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  hina: { key: 'hero-hina', file: `${base}/sprites/heroes/hero-kage-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
};

export const ENEMY_ATLASES = {
  tentacle: { key: 'enemy-tentacle', file: `${base}/sprites/enemies/enemy-creeper-move-8dir-6f-atlas.webp`, frameWidth: 181, frameHeight: 181 },
  boomer: { key: 'enemy-boomer', file: `${base}/sprites/enemies/enemy-bomber-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
  eye: { key: 'enemy-eye', file: `${base}/sprites/enemies/enemy-spitter-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 182 },
};

export const BOSS_ATLASES = {
  elder: { key: 'boss-elder', file: `${base}/sprites/bosses/boss-eclipse-mother-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  shub: { key: 'boss-shub', file: `${base}/sprites/bosses/boss-hollow-stag-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
};

export const STATIC_ASSETS = {
  map: `${base}/map/night-soil-calm-v3-2k.webp`,
  vfx: `${base}/fx/combat-vfx-atlas.webp`,
  ambient: `${base}/fx/map-ambient-atlas.webp`,
  spirit: `${base}/sprites/spirit-raven.webp`,
  upgradeIcons: `${base}/ui/upgrade-icons.webp?build=20260825r`,
  mysteriousTree: `${base}/sprites/mysterious-tree-4f.webp`,
};

export const DIRECTION_ROWS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
