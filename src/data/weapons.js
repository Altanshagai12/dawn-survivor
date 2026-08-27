import { WEAPON_ART } from '../config/assets.js?build=20260827b';

export const WEAPONS = {
  revolver: {
    id: 'revolver', name: 'Rune Revolver', nameMn: 'Рүн буу', art: WEAPON_ART.revolver,
    damage: 14, fireRate: 4, magazine: 6, reload: 1,
    projectileSpeed: 720, projectileLife: 1.2, spread: 3, projectiles: 1,
    pierce: 0, knockback: 62, bulletSize: 8, projectileTexture: 'bullet-revolver',
    description: 'Accurate, dependable, and quick to reload.',
    descriptionMn: 'Нарийн, найдвартай, хурдан цэнэглэгддэг тэнцвэртэй буу.',
  },
  shotgun: {
    id: 'shotgun', name: 'Grave Shotgun', nameMn: 'Булшны дробовик', art: WEAPON_ART.shotgun,
    damage: 12, fireRate: 5, magazine: 2, reload: 1,
    projectileSpeed: 560, projectileLife: .5, spread: 38, projectiles: 4,
    pierce: 0, knockback: 108, bulletSize: 6, projectileTexture: 'bullet-pellet',
    description: 'A wide burst that controls close hordes.',
    descriptionMn: 'Ойрын сүргийг өргөн цацалтаар хүчтэй тогтоон барина.',
  },
  crossbow: {
    id: 'crossbow', name: 'Night Crossbow', nameMn: 'Шөнийн нум', art: WEAPON_ART.crossbow,
    damage: 20, fireRate: 4, magazine: 1, reload: 1,
    projectileSpeed: 900, projectileLife: 1.5, spread: 0, projectiles: 1,
    pierce: 1, knockback: 92, bulletSize: 9, projectileTexture: 'bullet-bolt',
    chargeSeconds: 2.5, chargeDamageMax: 1.5,
    description: 'Damage rises while standing still and resets when you move.',
    descriptionMn: 'Зогсож онилоход гэмтэл өсөж, хөдлөхөд цэнэг арилна.',
  },
  flame: {
    id: 'flame', name: 'Ember Cannon', nameMn: 'Цогийн их буу', art: WEAPON_ART.flame,
    damage: 3, fireRate: 2.5, magazine: 12, reload: 1.4,
    projectileSpeed: 390, projectileLife: .62, spread: 12, projectiles: 1,
    pierce: 2, knockback: 24, bulletSize: 13, burnChance: 1, burnDps: 3,
    projectileTexture: 'bullet-flame',
    description: 'Short-range flame rounds always burn.',
    descriptionMn: 'Ойрын зайны дөлөн сум дайсныг үргэлж шатаана.',
  },
};

export function projectileTravelDistance(weapon, speedMultiplier = 1) {
  return weapon.projectileSpeed * speedMultiplier * weapon.projectileLife;
}
