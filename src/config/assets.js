const base = './assets';

export const HERO_ATLASES = {
  nyra: { key: 'hero-nyra', file: `${base}/sprites/heroes/hero-nyra-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  varka: { key: 'hero-varka', file: `${base}/sprites/heroes/hero-varka-move-8dir-6f-atlas-isolated.webp`, frameWidth: 222, frameHeight: 148 },
  sola: { key: 'hero-sola', file: `${base}/sprites/heroes/hero-sola-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  kage: { key: 'hero-kage', file: `${base}/sprites/heroes/hero-kage-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
};

export const ENEMY_ATLASES = {
  creeper: { key: 'enemy-creeper', file: `${base}/sprites/enemies/enemy-creeper-move-8dir-6f-atlas.webp`, frameWidth: 181, frameHeight: 181 },
  crawler: { key: 'enemy-crawler', file: `${base}/sprites/enemies/enemy-crawler-move-8dir-6f-atlas.webp`, frameWidth: 181, frameHeight: 181 },
  spitter: { key: 'enemy-spitter', file: `${base}/sprites/enemies/enemy-spitter-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 182 },
  bomber: { key: 'enemy-bomber', file: `${base}/sprites/enemies/enemy-bomber-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
  charger: { key: 'enemy-charger', file: `${base}/sprites/enemies/enemy-charger-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
  brute: { key: 'enemy-brute', file: `${base}/sprites/enemies/enemy-brute-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
  wingling: { key: 'enemy-wingling', file: `${base}/sprites/enemies/enemy-wingling-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
  splitter: { key: 'enemy-splitter', file: `${base}/sprites/enemies/enemy-splitter-move-8dir-6f-atlas-clean.webp`, frameWidth: 181, frameHeight: 181 },
};

export const BOSS_ATLASES = {
  'hollow-stag': { key: 'boss-hollow-stag', file: `${base}/sprites/bosses/boss-hollow-stag-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  'bell-warden': { key: 'boss-bell-warden', file: `${base}/sprites/bosses/boss-bell-warden-move-8dir-6f-atlas-isolated.webp`, frameWidth: 234, frameHeight: 140 },
  'eclipse-mother': { key: 'boss-eclipse-mother', file: `${base}/sprites/bosses/boss-eclipse-mother-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
};

export const STATIC_ASSETS = {
  map: `${base}/map/ashen-clearing.webp`,
  vfx: `${base}/fx/combat-vfx-atlas.webp`,
  ambient: `${base}/fx/map-ambient-atlas.webp`,
};

export const DIRECTION_ROWS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
