import { PREMIUM_SKINS } from './skins.js?build=20260903d';
import { WEAPONS } from './weapons.js?build=20260827b';

export const SKIN_PRICE_MNT = 500;
export const SKIN_BUNDLE_PRICE_MNT = 1000;
export const SKIN_STORE_VERSION = 'weapon-skins-20260903-v1';
export const SKIN_WEAPON_IDS = Object.freeze(['revolver', 'shotgun', 'crossbow', 'flame']);

export function weaponSkinGrant(weaponId, skinId) {
  if (!SKIN_WEAPON_IDS.includes(weaponId) || !Object.hasOwn(PREMIUM_SKINS, skinId)) return null;
  return `weapon:${weaponId}:${skinId}`;
}

export function skinProduct(skinId, weaponId, bundle = false) {
  if (typeof skinId !== 'string' || !Object.hasOwn(PREMIUM_SKINS, skinId)) return null;
  const skin = PREMIUM_SKINS[skinId];
  if (!skin || !SKIN_WEAPON_IDS.includes(weaponId)) return null;
  return {
    id: bundle ? `bundle:${skinId}` : weaponSkinGrant(weaponId, skinId),
    name: bundle ? `${skin.name} · 4 weapons` : `${skin.name} · ${WEAPONS[weaponId].name}`,
    amount: bundle ? SKIN_BUNDLE_PRICE_MNT : SKIN_PRICE_MNT,
    grants: (bundle ? SKIN_WEAPON_IDS : [weaponId]).map((id) => weaponSkinGrant(id, skinId)),
  };
}

export function skinPaymentDescription(product, language = 'en') {
  const [kind, first, second] = product.id.split(':');
  const skin = PREMIUM_SKINS[kind === 'bundle' ? first : second];
  const mn = language === 'mn';
  const weapon = kind === 'bundle' ? (mn ? '4 бууны багц' : '4 weapons')
    : (mn ? WEAPONS[first].nameMn : WEAPONS[first].name);
  return `Dawn Survivor · ${mn ? skin.nameMn : skin.name} · ${weapon}`;
}

// This exact game-owned document is registered in the platform's owner-only catalog API.
export const SKIN_STORE_CATALOG = Object.freeze({
  version: SKIN_STORE_VERSION,
  products: Object.values(PREMIUM_SKINS).flatMap((skin) => [
    ...SKIN_WEAPON_IDS.map((id) => skinProduct(skin.id, id)),
    skinProduct(skin.id, 'revolver', true),
  ]),
});

export function matchesSkinCatalog(catalog) {
  if (catalog?.version !== SKIN_STORE_VERSION || !Array.isArray(catalog.products)) return false;
  if (catalog.products.length !== SKIN_STORE_CATALOG.products.length) return false;
  const products = new Map(catalog.products.map((product) => [product.id, product]));
  return SKIN_STORE_CATALOG.products.every((expected) => {
    const actual = products.get(expected.id);
    return actual?.amount === expected.amount && Array.isArray(actual.grants)
      && actual.grants.length === expected.grants.length
      && expected.grants.every((grant) => actual.grants.includes(grant));
  });
}
