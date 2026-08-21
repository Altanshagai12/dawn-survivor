export const WEAPONS = {
  revolver: {
    id: 'revolver', name: 'Rune Revolver', nameMn: 'Рүн буу', icon: '✦',
    damage: 20, fireRate: 2.5, magazine: 6, reload: 1.15,
    projectileSpeed: 650, projectileLife: 1.15, spread: 3, projectiles: 1,
    pierce: 0, knockback: 62, bulletSize: 7,
    description: 'Accurate, dependable, and quick to reload.',
  },
  shotgun: {
    id: 'shotgun', name: 'Grave Shotgun', nameMn: 'Булшны дробовик', icon: '⌁',
    damage: 10, fireRate: 1.15, magazine: 2, reload: 1.35,
    projectileSpeed: 520, projectileLife: .68, spread: 34, projectiles: 5,
    pierce: 0, knockback: 108, bulletSize: 6,
    description: 'A wide burst that controls close hordes.',
  },
  smgs: {
    id: 'smgs', name: 'Twin Needles', nameMn: 'Хос зүү', icon: '‡',
    damage: 6, fireRate: 8.4, magazine: 32, reload: 1.55,
    projectileSpeed: 720, projectileLife: .92, spread: 11, projectiles: 1,
    pierce: 0, knockback: 28, bulletSize: 5,
    description: 'A torrent of low-damage rounds.',
  },
  flame: {
    id: 'flame', name: 'Ember Cannon', nameMn: 'Цогийн их буу', icon: '♨',
    damage: 7, fireRate: 10.5, magazine: 40, reload: 1.8,
    projectileSpeed: 360, projectileLife: .48, spread: 18, projectiles: 1,
    pierce: 1, knockback: 18, bulletSize: 11, burnChance: 1,
    description: 'Short-range flame rounds always burn.',
  },
};
