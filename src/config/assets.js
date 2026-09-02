const base = './assets';

export const WEAPON_ART = {
  revolver: `${base}/ui/weapons/rune-revolver.webp?build=20260827b`,
  shotgun: `${base}/ui/weapons/grave-shotgun.webp?build=20260827b`,
  crossbow: `${base}/ui/weapons/night-crossbow.webp?build=20260827b`,
  flame: `${base}/ui/weapons/ember-cannon.webp?build=20260827b`,
};

export const HERO_ATLASES = {
  shana: { key: 'hero-shana', file: `${base}/sprites/heroes/hero-nyra-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  diamond: { key: 'hero-diamond', file: `${base}/sprites/heroes/hero-varka-move-8dir-6f-atlas-isolated.webp`, frameWidth: 222, frameHeight: 148 },
  scarlett: { key: 'hero-scarlett', file: `${base}/sprites/heroes/hero-sola-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
  hina: { key: 'hero-hina', file: `${base}/sprites/heroes/hero-kage-move-8dir-6f-atlas-isolated.webp`, frameWidth: 181, frameHeight: 181 },
};

// Same frame geometry and animation order as the original bodies, without a baked gun.
export const WEAPONLESS_HERO_ATLASES = Object.fromEntries(
  Object.entries(HERO_ATLASES).map(([id, atlas]) => [id, {
    ...atlas,
    key: `${atlas.key}-unarmed`,
    file: `${base}/sprites/heroes/weaponless/${id}-atlas.webp?build=20260902e`,
    weaponless: true,
  }]),
);

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
  map: `${base}/map/night-soil-calm-v5-4k.webp`,
  vfx: `${base}/fx/combat-vfx-atlas.webp`,
  ambient: `${base}/fx/map-ambient-atlas.webp`,
  spirit: `${base}/sprites/spirit-raven.webp`,
  upgradeIcons: `${base}/ui/upgrade-icons.webp?build=20260825r`,
  mysteriousTree: `${base}/sprites/mysterious-tree-4f.webp`,
};

export const DIRECTION_ROWS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
