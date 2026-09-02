import {
  hasSkinAccess, normalizeSkinProfile, PREMIUM_SKINS, selectedSkin,
} from './skins.js?build=20260902d';

const WEAPON_IDS = Object.freeze(['revolver', 'shotgun', 'crossbow', 'flame']);

function accessibleSkin(profile, skinId) {
  return typeof skinId === 'string' && Object.hasOwn(PREMIUM_SKINS, skinId)
    && hasSkinAccess(profile, skinId) ? PREMIUM_SKINS[skinId] : null;
}

export function normalizeWeaponSkinProfile(profile) {
  const migrate = !Object.hasOwn(profile, 'equippedWeaponSkins');
  normalizeSkinProfile(profile);
  const legacySkin = migrate ? selectedSkin(profile, profile.selectedHero || 'shana') : null;
  const equipped = profile.equippedWeaponSkins;
  const mapping = equipped && typeof equipped === 'object' && !Array.isArray(equipped)
    ? equipped : {};
  profile.equippedWeaponSkins = Object.fromEntries(WEAPON_IDS.map((weaponId) => [
    weaponId, migrate ? legacySkin?.id || null : accessibleSkin(profile, mapping[weaponId])?.id || null,
  ]));
  return profile;
}

export function selectedWeaponSkin(profile, weaponId) {
  if (!WEAPON_IDS.includes(weaponId)) return null;
  return accessibleSkin(profile, profile.equippedWeaponSkins?.[weaponId]);
}

export function weaponSkinOptions(profile, weaponId) {
  if (!WEAPON_IDS.includes(weaponId)) return [];
  return [null, ...Object.values(PREMIUM_SKINS).filter((skin) => hasSkinAccess(profile, skin.id))];
}

export function setWeaponSkin(profile, weaponId, skinId) {
  if (!WEAPON_IDS.includes(weaponId)) return false;
  if (skinId !== null && !accessibleSkin(profile, skinId)) return false;
  normalizeWeaponSkinProfile(profile);
  profile.equippedWeaponSkins[weaponId] = skinId;
  return true;
}
