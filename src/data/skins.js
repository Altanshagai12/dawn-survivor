const base = './assets/skins/premium';
const weaponIds = Object.freeze(['revolver', 'shotgun', 'crossbow', 'flame']);
const projectileAnchors = Object.freeze({
  'shana-astral-warden': { revolver: [128, 121], shotgun: [104, 127], crossbow: [122, 128], flame: [110, 120] },
  'diamond-bloodmoon-regent': { revolver: [154, 120], shotgun: [156, 113], crossbow: [118, 137], flame: [139, 132] },
  'scarlett-sunforge-phoenix': { revolver: [133, 126], shotgun: [138, 114], crossbow: [84, 129], flame: [127, 123] },
  'hina-void-lotus': { revolver: [153, 128], shotgun: [131, 135], crossbow: [121, 132], flame: [135, 129] },
  'shana-celestial-dragon-sovereign': { revolver: [134, 127], shotgun: [132, 103], crossbow: [111, 108], flame: [118, 106] },
  'diamond-obsidian-eclipse-valkyrie': { revolver: [166, 134], shotgun: [155, 96], crossbow: [117, 105], flame: [141, 120] },
  'scarlett-prismatic-tempest-seraph': { revolver: [129, 133], shotgun: [138, 129], crossbow: [94, 124], flame: [122, 128] },
  'hina-nine-tail-chrono-kitsune': { revolver: [127, 113], shotgun: [141, 129], crossbow: [113, 127], flame: [126, 144] },
});
const shotgunRotationCorrections = Object.freeze({
  'shana-astral-warden': 31.3,
  'diamond-bloodmoon-regent': 17.1,
  'scarlett-sunforge-phoenix': 39.8,
  'hina-void-lotus': 26.3,
  'shana-celestial-dragon-sovereign': 49.6,
  'diamond-obsidian-eclipse-valkyrie': 32.4,
  'scarlett-prismatic-tempest-seraph': 46.2,
  'hina-nine-tail-chrono-kitsune': 28.7,
});

function skinWeaponArt(skinId) {
  return Object.freeze(Object.fromEntries(weaponIds.map((weaponId) => [
    weaponId, `${base}/weapons/${skinId}/${weaponId}.webp?build=20260902d`,
  ])));
}

function skinHeroAtlas(skinId, frameWidth, frameHeight) {
  return Object.freeze({
    key: `skin-hero-${skinId}`,
    file: `${base}/heroes/${skinId}-atlas.webp?build=20260901e`,
    frameWidth, frameHeight, weaponless: true,
  });
}

function skinPackArt(skinId) {
  return Object.freeze({
    full: `${base}/${skinId}-pack.webp?build=20260901e`,
    card: `${base}/${skinId}-card.webp?build=20260901e`,
  });
}

export const SKIN_CATALOG_VERSION = 'premium-v2';
export const SKIN_ACCESS_MODE = 'paid';

export const PREMIUM_SKINS = Object.freeze({
  'shana-astral-warden': Object.freeze({
    id: 'shana-astral-warden', heroId: 'shana', priceCredits: 500,
    rarity: 'legendary',
    name: 'Astral Warden', nameMn: 'Огторгуйн харуул',
    description: 'Crystal starlight remixes every weapon, impact, trail, and firing report.',
    descriptionMn: 'Бүх буу, сум, мөргөлт, мөр болон дууг одон талстын хувилбарт оруулна.',
    packArt: skinPackArt('shana-astral-warden').full,
    cardArt: skinPackArt('shana-astral-warden').card,
    heroAtlas: skinHeroAtlas('shana-astral-warden', 181, 181),
    weaponArt: skinWeaponArt('shana-astral-warden'),
    spriteTint: 0x9defff, primary: 0x56efff, secondary: 0xffd56a, impact: 0xe8ffff,
    motif: 'star', weaponPitch: 1.18, voicePitch: 1.15,
    vfxKey: 'skin-vfx-astral', vfxAtlas: `${base}/vfx/astral-vfx-atlas-v3.webp?build=20260828e`,
    audioBank: `${base}/audio/astral`,
  }),
  'diamond-bloodmoon-regent': Object.freeze({
    id: 'diamond-bloodmoon-regent', heroId: 'diamond', priceCredits: 500,
    rarity: 'legendary',
    name: 'Bloodmoon Regent', nameMn: 'Цусан сарын эзэн',
    description: 'Crimson lunar force gives every weapon a heavier report and moon-scar impact.',
    descriptionMn: 'Бүх бууг хүнд цохилт, цусан сарын сум, сарны сорвит мөргөлттэй болгоно.',
    packArt: skinPackArt('diamond-bloodmoon-regent').full,
    cardArt: skinPackArt('diamond-bloodmoon-regent').card,
    heroAtlas: skinHeroAtlas('diamond-bloodmoon-regent', 222, 148),
    weaponArt: skinWeaponArt('diamond-bloodmoon-regent'),
    spriteTint: 0xffa0a0, primary: 0xff334f, secondary: 0xd8a84b, impact: 0xffd3c7,
    motif: 'moon', weaponPitch: .82, voicePitch: .78,
    vfxKey: 'skin-vfx-bloodmoon', vfxAtlas: `${base}/vfx/bloodmoon-vfx-atlas-v3.webp?build=20260828e`,
    audioBank: `${base}/audio/bloodmoon`,
  }),
  'scarlett-sunforge-phoenix': Object.freeze({
    id: 'scarlett-sunforge-phoenix', heroId: 'scarlett', priceCredits: 500,
    rarity: 'legendary',
    name: 'Sunforge Phoenix', nameMn: 'Нарны дархны галт шувуу',
    description: 'Forged feathers turn every shot into a bright phoenix-grade spectacle.',
    descriptionMn: 'Бүх сумыг хайлмаг алт, галт өд, галт шувууны хүчтэй effect-тэй болгоно.',
    packArt: skinPackArt('scarlett-sunforge-phoenix').full,
    cardArt: skinPackArt('scarlett-sunforge-phoenix').card,
    heroAtlas: skinHeroAtlas('scarlett-sunforge-phoenix', 181, 181),
    weaponArt: skinWeaponArt('scarlett-sunforge-phoenix'),
    spriteTint: 0xffd08a, primary: 0xff8a24, secondary: 0xffe37a, impact: 0xfff2c4,
    motif: 'feather', weaponPitch: 1.04, voicePitch: 1.02,
    vfxKey: 'skin-vfx-sunforge', vfxAtlas: `${base}/vfx/sunforge-vfx-atlas-v3.webp?build=20260828e`,
    audioBank: `${base}/audio/sunforge`,
  }),
  'hina-void-lotus': Object.freeze({
    id: 'hina-void-lotus', heroId: 'hina', priceCredits: 500,
    rarity: 'legendary',
    name: 'Void Lotus Shogun', nameMn: 'Хоосон лянхуаны шогүн',
    description: 'Spectral petals reshape every projectile and give the dash a deep void echo.',
    descriptionMn: 'Бүх сумыг сүнслэг дэлбээтэй болгож, dash-д гүн хоосны цуурай нэмнэ.',
    packArt: skinPackArt('hina-void-lotus').full,
    cardArt: skinPackArt('hina-void-lotus').card,
    heroAtlas: skinHeroAtlas('hina-void-lotus', 181, 181),
    weaponArt: skinWeaponArt('hina-void-lotus'),
    spriteTint: 0xc48cff, primary: 0xb83cff, secondary: 0x67e0ff, impact: 0xf2d8ff,
    motif: 'lotus', weaponPitch: 1.28, voicePitch: 1.3,
    vfxKey: 'skin-vfx-void-lotus', vfxAtlas: `${base}/vfx/void-lotus-vfx-atlas-v3.webp?build=20260828e`,
    audioBank: `${base}/audio/void-lotus`,
  }),
  'shana-celestial-dragon-sovereign': Object.freeze({
    id: 'shana-celestial-dragon-sovereign', heroId: 'shana', priceCredits: 500,
    rarity: 'mythic',
    name: 'Celestial Dragon Sovereign', nameMn: 'Тэнгэрийн лууны дээд эзэн',
    description: 'Ivory-jade dragon arms, four sovereign weapons, and a radiant draconic combat score.',
    descriptionMn: 'Цагаан хаш лууны хуяг, дөрвөн хаан зэвсэг, лууны сүрт буудалт ба цохилтын дуу.',
    packArt: skinPackArt('shana-celestial-dragon-sovereign').full,
    cardArt: skinPackArt('shana-celestial-dragon-sovereign').card,
    heroAtlas: skinHeroAtlas('shana-celestial-dragon-sovereign', 181, 181),
    weaponArt: skinWeaponArt('shana-celestial-dragon-sovereign'),
    spriteTint: 0xc9ffff, primary: 0x25e9ff, secondary: 0xffd86b, impact: 0xedffff,
    motif: 'dragon', weaponPitch: 1.12, voicePitch: 1.08,
    vfxKey: 'skin-vfx-celestial-dragon',
    vfxAtlas: `${base}/vfx/celestial-dragon-vfx-atlas.webp?build=20260901e`,
    audioBank: `${base}/audio/celestial-dragon`,
  }),
  'diamond-obsidian-eclipse-valkyrie': Object.freeze({
    id: 'diamond-obsidian-eclipse-valkyrie', heroId: 'diamond', priceCredits: 500,
    rarity: 'mythic',
    name: 'Obsidian Eclipse Valkyrie', nameMn: 'Хар хиртэлтийн валькири',
    description: 'Obsidian lunar weapons collapse into black-sun impacts with a heavy eclipse report.',
    descriptionMn: 'Хар сарны зэвсэг бүр хар нарны цохилт болон хүнд хиртэлтийн дуутай болно.',
    packArt: skinPackArt('diamond-obsidian-eclipse-valkyrie').full,
    cardArt: skinPackArt('diamond-obsidian-eclipse-valkyrie').card,
    heroAtlas: skinHeroAtlas('diamond-obsidian-eclipse-valkyrie', 222, 148),
    weaponArt: skinWeaponArt('diamond-obsidian-eclipse-valkyrie'),
    spriteTint: 0xff85cd, primary: 0xff2f9d, secondary: 0x8517c9, impact: 0xffd0eb,
    motif: 'eclipse', weaponPitch: .72, voicePitch: .74,
    vfxKey: 'skin-vfx-obsidian-eclipse',
    vfxAtlas: `${base}/vfx/obsidian-eclipse-vfx-atlas.webp?build=20260901e`,
    audioBank: `${base}/audio/obsidian-eclipse`,
  }),
  'scarlett-prismatic-tempest-seraph': Object.freeze({
    id: 'scarlett-prismatic-tempest-seraph', heroId: 'scarlett', priceCredits: 500,
    rarity: 'mythic',
    name: 'Prismatic Tempest Seraph', nameMn: 'Солонгон шуурганы сераф',
    description: 'White-gold storm arms split every shot into prismatic thunder and crystal-wing impacts.',
    descriptionMn: 'Цагаан алтат шуурганы зэвсэг сум бүрийг солонгон аянга, талст далавчит цохилт болгоно.',
    packArt: skinPackArt('scarlett-prismatic-tempest-seraph').full,
    cardArt: skinPackArt('scarlett-prismatic-tempest-seraph').card,
    heroAtlas: skinHeroAtlas('scarlett-prismatic-tempest-seraph', 181, 181),
    weaponArt: skinWeaponArt('scarlett-prismatic-tempest-seraph'),
    spriteTint: 0xf2f8ff, primary: 0x64c9ff, secondary: 0xffcf63, impact: 0xffffff,
    motif: 'seraph', weaponPitch: 1.2, voicePitch: 1.14,
    vfxKey: 'skin-vfx-prismatic-tempest',
    vfxAtlas: `${base}/vfx/prismatic-tempest-vfx-atlas.webp?build=20260901e`,
    audioBank: `${base}/audio/prismatic-tempest`,
  }),
  'hina-nine-tail-chrono-kitsune': Object.freeze({
    id: 'hina-nine-tail-chrono-kitsune', heroId: 'hina', priceCredits: 500,
    rarity: 'mythic',
    name: 'Nine-Tail Chrono Kitsune', nameMn: 'Есөн сүүлт цагийн кицүнэ',
    description: 'Kitsune clockwork reshapes all four weapons into foxfire and time-rift signatures.',
    descriptionMn: 'Кицүнэ цагийн урлал дөрвөн бууг үнэгэн гал, цагийн ан цавын онцгой effect-тэй болгоно.',
    packArt: skinPackArt('hina-nine-tail-chrono-kitsune').full,
    cardArt: skinPackArt('hina-nine-tail-chrono-kitsune').card,
    heroAtlas: skinHeroAtlas('hina-nine-tail-chrono-kitsune', 181, 181),
    weaponArt: skinWeaponArt('hina-nine-tail-chrono-kitsune'),
    spriteTint: 0xbba8ff, primary: 0x8c42ff, secondary: 0x35e5e7, impact: 0xf0e5ff,
    motif: 'kitsune', weaponPitch: 1.34, voicePitch: 1.28,
    vfxKey: 'skin-vfx-chrono-kitsune',
    vfxAtlas: `${base}/vfx/chrono-kitsune-vfx-atlas.webp?build=20260901e`,
    audioBank: `${base}/audio/chrono-kitsune`,
  }),
});

export const SKINS_BY_HERO = Object.freeze(Object.fromEntries(
  ['shana', 'diamond', 'scarlett', 'hina'].map((heroId) => [heroId,
    Object.freeze(Object.values(PREMIUM_SKINS).filter((skin) => skin.heroId === heroId))]),
));

export const SKIN_BY_HERO = Object.freeze(Object.fromEntries(
  Object.entries(SKINS_BY_HERO).map(([heroId, skins]) => [heroId, skins[0]]),
));

export function hasSkinAccess(_profile, _skinId) {
  // Retired hero-pack ownership cannot grant individual paid weapon skins.
  return false;
}

export function normalizeSkinProfile(profile) {
  const owned = new Set(Array.isArray(profile.ownedSkins) ? profile.ownedSkins : []);
  profile.ownedSkins = [...owned].filter((id) => Boolean(PREMIUM_SKINS[id]));
  const equipped = profile.equippedSkins && typeof profile.equippedSkins === 'object'
    ? profile.equippedSkins : {};
  profile.equippedSkins = Object.fromEntries(Object.entries(equipped).filter(([heroId, skinId]) => {
    const skin = PREMIUM_SKINS[skinId];
    return skin?.heroId === heroId && hasSkinAccess(profile, skinId);
  }));
  if (!profile.pendingSkinPurchase || typeof profile.pendingSkinPurchase !== 'object') {
    profile.pendingSkinPurchase = null;
  }
  return profile;
}

export function selectedSkin(profile, heroId) {
  const id = profile.equippedSkins?.[heroId];
  return PREMIUM_SKINS[id]?.heroId === heroId && hasSkinAccess(profile, id)
    ? PREMIUM_SKINS[id] : null;
}

export function skinProjectileTint(skin, weaponId) {
  if (!skin) return null;
  if (weaponId === 'flame') return skin.secondary;
  if (weaponId === 'crossbow') return skin.impact;
  return skin.primary;
}

export function skinProjectileAnchor(skin, weaponId) {
  const point = projectileAnchors[skin?.id]?.[weaponId] || [128, 128];
  return { x: point[0] / 256, y: point[1] / 256 };
}

export function skinProjectileRotation(skin, weaponId) {
  if (weaponId !== 'shotgun') return 0;
  return (shotgunRotationCorrections[skin?.id] || 0) * Math.PI / 180;
}

export function weaponArtForSkin(skin, weapon) {
  return skin?.weaponArt?.[weapon.id] || weapon.art;
}
