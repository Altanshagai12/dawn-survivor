import { TEN_MINUTES_BALANCE } from '../config/balance.js';

export const BASE_HERO_SPEED = TEN_MINUTES_BALANCE.player.baseRunSpeed;

export const HEROES = {
  shana: {
    id: 'shana', name: 'Shana', nameMn: 'Шана', hp: 3, speed: BASE_HERO_SPEED, size: 42,
    portrait: './assets/portraits/nyra-anchor.webp', passive: 'reroll',
    passiveText: 'Can reroll upgrades once per level.',
    passiveMn: 'Ердийн level бүрийн сонголтыг нэг удаа шинэчилнэ.',
  },
  diamond: {
    id: 'diamond', name: 'Diamond', nameMn: 'Даймонд', hp: 6, speed: BASE_HERO_SPEED, size: 48,
    portrait: './assets/portraits/varka-anchor.webp', passive: 'highHp',
    passiveText: 'Starts with 6 HP.', passiveMn: '6 амьтай эхэлнэ.',
  },
  scarlett: {
    id: 'scarlett', name: 'Scarlett', nameMn: 'Скарлетт', hp: 2, speed: BASE_HERO_SPEED, size: 43,
    portrait: './assets/portraits/sola-anchor.webp', passive: 'fireWave',
    passiveText: 'Every third fire event releases a burning Flame Wave.',
    passiveMn: 'Гурав дахь галлалт бүр шаталтын долгион гаргана.',
  },
  hina: {
    id: 'hina', name: 'Hina', nameMn: 'Хина', hp: 2, speed: BASE_HERO_SPEED, size: 41,
    portrait: './assets/portraits/kage-anchor.webp', passive: 'dashClone',
    passiveText: 'Dash toward aim and leave an attacking stationary clone.',
    passiveMn: 'Ониолтын чиглэл рүү дайрч, бууддаг хөдөлгөөнгүй хуулбар үлдээнэ.',
  },
};
