import assert from 'node:assert/strict';
import test from 'node:test';
import { PREMIUM_SKINS } from '../src/data/skins.js?build=20260903d';
import {
  applySkinEntitlements, hasWeaponSkinAccess, normalizeWeaponSkinProfile,
  selectedWeaponSkin, setWeaponSkin, weaponSkinOptions,
} from '../src/data/weaponSkins.js?build=20260903d';
import { skinProduct, SKIN_WEAPON_IDS, SKIN_STORE_CATALOG, matchesSkinCatalog } from '../src/data/skinProducts.js?build=20260903d';

const A = 'shana-astral-warden';
const B = 'diamond-bloodmoon-regent';
const allWeapons = (id = null) => Object.fromEntries(SKIN_WEAPON_IDS.map((weapon) => [weapon, id]));

test('catalog has 32 individual weapon skins at500 and8 same-theme bundles at1000', () => {
  assert.equal(SKIN_STORE_CATALOG.products.length, 40);
  assert.equal(new Set(SKIN_STORE_CATALOG.products.map((p) => p.id)).size, 40);
  for (const skin of Object.values(PREMIUM_SKINS)) {
    for (const weapon of SKIN_WEAPON_IDS) {
      const single = skinProduct(skin.id, weapon);
      assert.equal(single.amount, 500);
      assert.deepEqual(single.grants, [`weapon:${weapon}:${skin.id}`]);
    }
    const bundle = skinProduct(skin.id, 'revolver', true);
    assert.equal(bundle.amount, 1000);
    assert.equal(bundle.grants.length, 4);
  }
  assert.ok(matchesSkinCatalog(SKIN_STORE_CATALOG));
  for (const modify of [
    (c) => { c.version = 'old'; }, (c) => { c.products.pop(); },
    (c) => { c.products[0].amount = 1; }, (c) => { c.products[0].grants = c.products[1].grants; },
  ]) {
    const catalog = structuredClone(SKIN_STORE_CATALOG);
    modify(catalog);
    assert.equal(matchesSkinCatalog(catalog), false);
  }
});

test('original weapons remain free, all paid skins remain browseable without access', () => {
  const profile = normalizeWeaponSkinProfile({});
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons());
  for (const weapon of SKIN_WEAPON_IDS) {
    assert.equal(weaponSkinOptions(profile, weapon).length, 9);
    assert.ok(setWeaponSkin(profile, weapon, null));
    assert.equal(setWeaponSkin(profile, weapon, A), false);
    assert.equal(selectedWeaponSkin(profile, weapon), null);
  }
});

test('legacy hero trial and serialized ownership cannot grant a paid weapon', () => {
  const profile = normalizeWeaponSkinProfile({
    selectedHero: 'shana', ownedSkins: [A], ownedWeaponSkins: allWeapons(A),
    equippedSkins: { shana: A }, equippedWeaponSkins: allWeapons(A),
  });
  for (const weapon of SKIN_WEAPON_IDS) assert.equal(selectedWeaponSkin(profile, weapon), null);
  assert.deepEqual(normalizeWeaponSkinProfile({ equippedSkins: { shana: A } }).equippedWeaponSkins, allWeapons());
});

test('verified single unlock grants only its exact gun and skin', () => {
  const profile = normalizeWeaponSkinProfile({});
  applySkinEntitlements(profile, skinProduct(A, 'shotgun').grants);
  assert.ok(setWeaponSkin(profile, 'shotgun', A));
  assert.equal(selectedWeaponSkin(profile, 'shotgun'), PREMIUM_SKINS[A]);
  assert.equal(setWeaponSkin(profile, 'revolver', A), false);
  assert.equal(setWeaponSkin(profile, 'shotgun', B), false);
});

test('bundle grants all4guns, independent of selected hero', () => {
  const profile = normalizeWeaponSkinProfile({ selectedHero: 'hina' });
  applySkinEntitlements(profile, skinProduct(A, 'revolver', true).grants);
  for (const weapon of SKIN_WEAPON_IDS) assert.ok(setWeaponSkin(profile, weapon, A));
  profile.selectedHero = 'diamond';
  normalizeWeaponSkinProfile(profile);
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons(A));
  assert.ok(setWeaponSkin(profile, 'shotgun', null));
  assert.deepEqual(profile.equippedWeaponSkins, { ...allWeapons(A), shotgun: null });
});

test('verified access is not serializable and cannot leak to another profile/account', () => {
  const profile = normalizeWeaponSkinProfile({ equippedWeaponSkins: allWeapons(A) });
  applySkinEntitlements(profile, skinProduct(A, 'revolver', true).grants);
  assert.equal(selectedWeaponSkin(profile, 'revolver'), PREMIUM_SKINS[A]);
  const restored = normalizeWeaponSkinProfile(JSON.parse(JSON.stringify(profile)));
  assert.equal(selectedWeaponSkin(restored, 'revolver'), null);
  applySkinEntitlements(restored, skinProduct(A, 'revolver').grants);
  assert.equal(selectedWeaponSkin(restored, 'revolver'), PREMIUM_SKINS[A]);
  assert.equal(selectedWeaponSkin(restored, 'shotgun'), null);
  applySkinEntitlements(profile, []);
  assert.equal(selectedWeaponSkin(profile, 'revolver'), null);
});

test('unknown/prototype values never become products, options or access', () => {
  const profile = normalizeWeaponSkinProfile({
    equippedWeaponSkins: { revolver: 'constructor', shotgun: '__proto__', crossbow: {}, flame: A },
  });
  assert.deepEqual(profile.equippedWeaponSkins, { ...allWeapons(), flame: A });
  for (const value of ['unknown', 'constructor', '__proto__', null, undefined, 1, {}, []]) {
    assert.equal(setWeaponSkin(profile, value, A), false);
    assert.equal(selectedWeaponSkin(profile, value), null);
    assert.deepEqual(weaponSkinOptions(profile, value), []);
    assert.equal(skinProduct(A, value), null);
    if (value !== null) {
      assert.equal(setWeaponSkin(profile, 'revolver', value), false);
      assert.equal(hasWeaponSkinAccess(profile, 'revolver', value), false);
      assert.equal(skinProduct(value, 'revolver'), null);
    }
  }
});
