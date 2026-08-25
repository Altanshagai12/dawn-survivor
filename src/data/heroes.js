export const BASE_HERO_SPEED = 180;

export const HEROES = {
  nyra: {
    id: 'nyra', name: 'Nyra', nameMn: 'Найра', hp: 4, speed: BASE_HERO_SPEED, size: 42,
    portrait: './assets/portraits/nyra-anchor.webp',
    passive: 'reroll',
    passiveText: 'Reroll upgrade choices once each level.',
    passiveMn: 'Түвшин бүрд upgrade сонголтыг нэг удаа шинэчилнэ.',
    chest: [
      { id: 'nyra-focus', icon: '◉', name: 'Perfect Focus', desc: '+35% fire rate and reload speed.', mods: { fireRateMul: .35, reloadMul: .35 } },
      { id: 'nyra-learn', icon: '◆', name: 'Night Scholar', desc: '+40% experience gained.', mods: { xpMul: .4 } },
      { id: 'nyra-triple', icon: '⋔', name: 'Triple Choice', desc: 'Every third shot fires two echoes.', set: { nyraEcho: true } },
    ],
  },
  varka: {
    id: 'varka', name: 'Varka', nameMn: 'Варка', hp: 7, speed: BASE_HERO_SPEED, size: 48,
    portrait: './assets/portraits/varka-anchor.webp',
    passive: 'rage',
    passiveText: 'Taking damage permanently adds fire and reload rate.',
    passiveMn: 'Гэмтэл авах бүрд галлах ба цэнэглэх хурд нэмэгдэнэ.',
    chest: [
      { id: 'varka-bulk', icon: '♥', name: 'Iron Blood', desc: '+2 max HP and heal 2.', mods: { maxHpAdd: 2, heal: 2 } },
      { id: 'varka-rage', icon: 'ϟ', name: 'Redline', desc: 'Double the bonus gained when hit.', set: { doubleRage: true } },
      { id: 'varka-weight', icon: '✹', name: 'Heavy Rounds', desc: '+50% damage and knockback.', mods: { damageMul: .5, knockbackMul: .5 } },
    ],
  },
  sola: {
    id: 'sola', name: 'Sola', nameMn: 'Сола', hp: 3, speed: BASE_HERO_SPEED, size: 43,
    portrait: './assets/portraits/sola-anchor.webp',
    passive: 'fireWave',
    passiveText: 'Every third shot releases a burning wave.',
    passiveMn: 'Гурав дахь сум бүр шаталтын долгион гаргана.',
    chest: [
      { id: 'sola-flare', icon: '☀', name: 'Solar Flare', desc: 'Burn damage +100%.', mods: { burnDamageMul: 1 } },
      { id: 'sola-heal', icon: '♥', name: 'Warmth', desc: 'Every 60 burn kills heal 1 HP.', set: { burnHeal: true } },
      { id: 'sola-wave', icon: '♨', name: 'Wildfire', desc: 'Burning waves occur every second shot.', set: { rapidFireWave: true } },
    ],
  },
  kage: {
    id: 'kage', name: 'Kage', nameMn: 'Кагэ', hp: 3, speed: BASE_HERO_SPEED, size: 41,
    portrait: './assets/portraits/kage-anchor.webp',
    passive: 'shadow',
    passiveText: 'Kills can release a homing shadow bolt.',
    passiveMn: 'Устгасан дайснаас чиглэдэг сүүдрийн сум гарч болно.',
    chest: [
      { id: 'kage-swarm', icon: '☾', name: 'Shadow Swarm', desc: 'Shadow bolt chance becomes 40%.', set: { shadowChance: .4 } },
      { id: 'kage-edge', icon: '➜', name: 'Night Edge', desc: '+30% movement and projectile speed.', mods: { moveSpeedMul: .3, projectileSpeedMul: .3 } },
      { id: 'kage-veil', icon: '◐', name: 'Veil Step', desc: 'Moving grants 20% dodge chance.', set: { dodgeChance: .2 } },
    ],
  },
};
