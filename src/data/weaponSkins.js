import { normalizeSkinProfile, PREMIUM_SKINS } from './skins.js?build=20260903d';
import { SKIN_WEAPON_IDS, weaponSkinGrant } from './skinProducts.js?build=20260903d';

// Preferences are client-writable; paid access is restored only from the authenticated API.
// Keep verified ownership out of serialized Usion/local storage profiles.
const verifiedAccess = new WeakMap();

export function applySkinEntitlements(profile, grants) {
  verifiedAccess.set(profile, new Set(Array.isArray(grants) ? grants.filter((v) => typeof v === 'string') : []));
}

export function hasWeaponSkinAccess(profile, weaponId, skinId) {
  if (skinId === null && SKIN_WEAPON_IDS.includes(weaponId)) return true;
  const grant = weaponSkinGrant(weaponId, skinId);
  return Boolean(grant && verifiedAccess.get(profile)?.has(grant));
}

export function normalizeWeaponSkinProfile(profile) {
  normalizeSkinProfile(profile);
  const equipped = profile.equippedWeaponSkins;
  const mapping = equipped && typeof equipped === 'object' && !Array.isArray(equipped)
    ? equipped : {};
  // Retain valid preferences while ownership loads; legacy free trials never grant access.
  profile.equippedWeaponSkins = Object.fromEntries(SKIN_WEAPON_IDS.map((weaponId) => [
    weaponId, typeof mapping[weaponId] === 'string' && Object.hasOwn(PREMIUM_SKINS, mapping[weaponId])
      ? mapping[weaponId] : null,
  ]));
  return profile;
}

export function selectedWeaponSkin(profile, weaponId) {
  const skinId = profile.equippedWeaponSkins?.[weaponId];
  return hasWeaponSkinAccess(profile, weaponId, skinId) ? PREMIUM_SKINS[skinId] || null : null;
}

export function weaponSkinOptions(_profile, weaponId) {
  return SKIN_WEAPON_IDS.includes(weaponId) ? [null, ...Object.values(PREMIUM_SKINS)] : [];
}

export function setWeaponSkin(profile, weaponId, skinId) {
  if (!hasWeaponSkinAccess(profile, weaponId, skinId)) return false;
  normalizeWeaponSkinProfile(profile);
  profile.equippedWeaponSkins[weaponId] = skinId;
  return true;
}
