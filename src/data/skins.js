const base = './assets/skins/premium';

export const SKIN_CATALOG_VERSION = 'premium-v1';
export const SKIN_PURCHASE_ENDPOINT = 'https://dawn-survivor.vercel.app/api/purchase-skin';
export const SKIN_ACCESS_MODE = 'free-preview';

export const PREMIUM_SKINS = Object.freeze({
  'shana-astral-warden': Object.freeze({
    id: 'shana-astral-warden', heroId: 'shana', priceCredits: 240,
    name: 'Astral Warden', nameMn: 'Огторгуйн харуул',
    description: 'Crystal starlight remixes every weapon, impact, trail, and voice cue.',
    descriptionMn: 'Бүх буу, сум, мөргөлт, мөр болон дууг одон талстын хувилбарт оруулна.',
    packArt: `${base}/shana-astral-warden-pack.webp?build=20260828a`,
    spriteTint: 0x9defff, primary: 0x56efff, secondary: 0xffd56a, impact: 0xe8ffff,
    motif: 'star', weaponPitch: 1.18, voicePitch: 1.15,
    voice: `${base}/voice/shana-astral-warden.wav?build=20260828a`,
  }),
  'diamond-bloodmoon-regent': Object.freeze({
    id: 'diamond-bloodmoon-regent', heroId: 'diamond', priceCredits: 250,
    name: 'Bloodmoon Regent', nameMn: 'Цусан сарын эзэн',
    description: 'Crimson lunar force gives every weapon a heavier report and moon-scar impact.',
    descriptionMn: 'Бүх бууг хүнд цохилт, цусан сарын сум, сарны сорвит мөргөлттэй болгоно.',
    packArt: `${base}/diamond-bloodmoon-regent-pack.webp?build=20260828a`,
    spriteTint: 0xffa0a0, primary: 0xff334f, secondary: 0xd8a84b, impact: 0xffd3c7,
    motif: 'moon', weaponPitch: .82, voicePitch: .78,
    voice: `${base}/voice/diamond-bloodmoon-regent.wav?build=20260828a`,
  }),
  'scarlett-sunforge-phoenix': Object.freeze({
    id: 'scarlett-sunforge-phoenix', heroId: 'scarlett', priceCredits: 260,
    name: 'Sunforge Phoenix', nameMn: 'Нарны дархны галт шувуу',
    description: 'Forged feathers turn every shot into a bright phoenix-grade spectacle.',
    descriptionMn: 'Бүх сумыг хайлмаг алт, галт өд, галт шувууны хүчтэй effect-тэй болгоно.',
    packArt: `${base}/scarlett-sunforge-phoenix-pack.webp?build=20260828a`,
    spriteTint: 0xffd08a, primary: 0xff8a24, secondary: 0xffe37a, impact: 0xfff2c4,
    motif: 'feather', weaponPitch: 1.04, voicePitch: 1.02,
    voice: `${base}/voice/scarlett-sunforge-phoenix.wav?build=20260828a`,
  }),
  'hina-void-lotus': Object.freeze({
    id: 'hina-void-lotus', heroId: 'hina', priceCredits: 270,
    name: 'Void Lotus Shogun', nameMn: 'Хоосон лянхуаны шогүн',
    description: 'Spectral petals reshape every projectile and give the dash a voiced void echo.',
    descriptionMn: 'Бүх сумыг сүнслэг дэлбээтэй болгож, dash-д хоосны voice echo нэмнэ.',
    packArt: `${base}/hina-void-lotus-pack.webp?build=20260828a`,
    spriteTint: 0xc48cff, primary: 0xb83cff, secondary: 0x67e0ff, impact: 0xf2d8ff,
    motif: 'lotus', weaponPitch: 1.28, voicePitch: 1.3,
    voice: `${base}/voice/hina-void-lotus.wav?build=20260828a`,
  }),
});

export const SKIN_BY_HERO = Object.freeze(Object.fromEntries(
  Object.values(PREMIUM_SKINS).map((skin) => [skin.heroId, skin]),
));

export function hasSkinAccess(profile, skinId) {
  return SKIN_ACCESS_MODE === 'free-preview' || profile.ownedSkins?.includes(skinId);
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
