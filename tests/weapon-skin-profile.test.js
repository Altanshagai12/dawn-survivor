import assert from 'node:assert/strict';
import test from 'node:test';

import { hasSkinAccess, PREMIUM_SKINS } from '../src/data/skins.js?build=20260902d';
import {
  normalizeWeaponSkinProfile, selectedWeaponSkin, setWeaponSkin, weaponSkinOptions,
} from '../src/data/weaponSkins.js';

const WEAPON_IDS = ['revolver', 'shotgun', 'crossbow', 'flame'];
const ASTRAL = 'shana-astral-warden';
const BLOODMOON = 'diamond-bloodmoon-regent';
const LOTUS = 'hina-void-lotus';

function allWeapons(skinId = null) {
  return Object.fromEntries(WEAPON_IDS.map((weaponId) => [weaponId, skinId]));
}

test('new profiles get all four base weapons without paid ownership', () => {
  const profile = {};
  assert.equal(normalizeWeaponSkinProfile(profile), profile);
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons());
  assert.deepEqual(profile.ownedSkins, []);
  assert.deepEqual(profile.equippedSkins, {});
  assert.equal(profile.pendingSkinPurchase, null);
});

test('migration carries the selected hero skin to all four weapons and keeps legacy choices', () => {
  const legacy = { shana: ASTRAL, diamond: BLOODMOON, hina: LOTUS };
  const profile = normalizeWeaponSkinProfile({ selectedHero: 'diamond', equippedSkins: legacy });
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons(BLOODMOON));
  assert.deepEqual(profile.equippedSkins, legacy);
  assert.deepEqual(profile.ownedSkins, []);
});

test('migration defaults an absent selected hero to Shana, not another equipped hero', () => {
  const profile = normalizeWeaponSkinProfile({ equippedSkins: { shana: ASTRAL, hina: LOTUS } });
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons(ASTRAL));
  const unequipped = normalizeWeaponSkinProfile({ selectedHero: 'scarlett', equippedSkins: { hina: LOTUS } });
  assert.deepEqual(unequipped.equippedWeaponSkins, allWeapons());
});

test('migration is idempotent and hero changes cannot reapply legacy skins', () => {
  const profile = normalizeWeaponSkinProfile({
    selectedHero: 'shana', equippedSkins: { shana: ASTRAL, hina: LOTUS },
  });
  const normalized = structuredClone(profile);
  normalizeWeaponSkinProfile(profile);
  assert.deepEqual(profile, normalized);
  profile.selectedHero = 'hina';
  profile.equippedSkins.shana = 'shana-celestial-dragon-sovereign';
  normalizeWeaponSkinProfile(profile);
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons(ASTRAL));
});

test('existing canonical maps retain null and never fill missing entries from legacy choices', () => {
  const profile = normalizeWeaponSkinProfile({
    equippedSkins: { shana: ASTRAL },
    equippedWeaponSkins: { revolver: null, shotgun: BLOODMOON },
  });
  assert.deepEqual(profile.equippedWeaponSkins, { ...allWeapons(), shotgun: BLOODMOON });
  normalizeWeaponSkinProfile(profile);
  assert.equal(selectedWeaponSkin(profile, 'revolver'), null);
});

test('invalid existing canonical values reset to base without resurrecting legacy choices', () => {
  for (const equippedWeaponSkins of [null, undefined, false, 'invalid', [], {}]) {
    const profile = normalizeWeaponSkinProfile({
      equippedSkins: { shana: ASTRAL }, equippedWeaponSkins,
    });
    assert.deepEqual(profile.equippedWeaponSkins, allWeapons());
  }
  const profile = normalizeWeaponSkinProfile({
    equippedSkins: { shana: ASTRAL },
    equippedWeaponSkins: {
      revolver: 'not-a-skin', shotgun: 'constructor', crossbow: '__proto__', flame: 1,
      unknownWeapon: ASTRAL,
    },
  });
  assert.deepEqual(profile.equippedWeaponSkins, allWeapons());
});

test('every weapon offers base plus every accessible pack regardless of selected hero', () => {
  const profile = normalizeWeaponSkinProfile({ selectedHero: 'hina' });
  const expected = [null, ...Object.values(PREMIUM_SKINS)
    .filter((skin) => hasSkinAccess(profile, skin.id))];
  assert.equal(Object.keys(PREMIUM_SKINS).length, 8);
  for (const weaponId of WEAPON_IDS) {
    assert.deepEqual(weaponSkinOptions(profile, weaponId), expected);
    profile.selectedHero = 'diamond';
    assert.deepEqual(weaponSkinOptions(profile, weaponId), expected);
  }
  assert.deepEqual(profile.ownedSkins, []);
});

test('skin selection is independent per weapon and can cross the former hero boundary', () => {
  const profile = normalizeWeaponSkinProfile({ selectedHero: 'hina' });
  assert.equal(setWeaponSkin(profile, 'revolver', ASTRAL), true);
  assert.equal(setWeaponSkin(profile, 'shotgun', BLOODMOON), true);
  assert.equal(selectedWeaponSkin(profile, 'revolver'), PREMIUM_SKINS[ASTRAL]);
  assert.equal(selectedWeaponSkin(profile, 'shotgun'), PREMIUM_SKINS[BLOODMOON]);
  assert.equal(selectedWeaponSkin(profile, 'crossbow'), null);
  assert.deepEqual(profile.equippedWeaponSkins, {
    revolver: ASTRAL, shotgun: BLOODMOON, crossbow: null, flame: null,
  });
  profile.selectedHero = 'scarlett';
  normalizeWeaponSkinProfile(profile);
  assert.equal(selectedWeaponSkin(profile, 'revolver'), PREMIUM_SKINS[ASTRAL]);
  assert.equal(selectedWeaponSkin(profile, 'shotgun'), PREMIUM_SKINS[BLOODMOON]);
});

test('base selection clears only one weapon and stays cleared after normalization', () => {
  const profile = normalizeWeaponSkinProfile({ equippedSkins: { shana: ASTRAL } });
  assert.equal(setWeaponSkin(profile, 'shotgun', null), true);
  normalizeWeaponSkinProfile(profile);
  assert.deepEqual(profile.equippedWeaponSkins, { ...allWeapons(ASTRAL), shotgun: null });
  assert.equal(selectedWeaponSkin(profile, 'shotgun'), null);
  assert.deepEqual(profile.equippedSkins, { shana: ASTRAL });
});

test('unknown weapon IDs and invalid skin IDs are rejected without changing the profile', () => {
  const profile = normalizeWeaponSkinProfile({ equippedWeaponSkins: allWeapons(ASTRAL) });
  const snapshot = structuredClone(profile);
  for (const weaponId of ['unknown', 'constructor', '__proto__', null, undefined, {}, 1]) {
    assert.equal(setWeaponSkin(profile, weaponId, BLOODMOON), false);
    assert.equal(selectedWeaponSkin(profile, weaponId), null);
    assert.deepEqual(weaponSkinOptions(profile, weaponId), []);
  }
  for (const skinId of ['unknown', 'constructor', '__proto__', '', undefined, {}, [], 1]) {
    assert.equal(setWeaponSkin(profile, 'revolver', skinId), false);
  }
  assert.deepEqual(profile, snapshot);
});

test('selection validates canonical skin IDs instead of trusting profile data or legacy fallback', () => {
  const profile = {
    equippedSkins: { shana: ASTRAL },
    equippedWeaponSkins: { revolver: 'constructor', shotgun: null, crossbow: 'unknown', flame: LOTUS },
  };
  assert.equal(selectedWeaponSkin(profile, 'revolver'), null);
  assert.equal(selectedWeaponSkin(profile, 'shotgun'), null);
  assert.equal(selectedWeaponSkin(profile, 'crossbow'), null);
  assert.equal(selectedWeaponSkin(profile, 'flame'), PREMIUM_SKINS[LOTUS]);
  assert.equal(selectedWeaponSkin({ equippedSkins: { shana: ASTRAL } }, 'revolver'), null);
});

test('equipping skins does not grant ownership, settle payment, or rewrite legacy equipped choices', () => {
  const pendingSkinPurchase = { skinId: BLOODMOON, receiptToken: 'pending-receipt' };
  const profile = normalizeWeaponSkinProfile({
    ownedSkins: [LOTUS, LOTUS, 'unknown'], equippedSkins: { shana: ASTRAL }, pendingSkinPurchase,
  });
  assert.equal(setWeaponSkin(profile, 'revolver', BLOODMOON), true);
  assert.deepEqual(profile.ownedSkins, [LOTUS]);
  assert.deepEqual(profile.equippedSkins, { shana: ASTRAL });
  assert.equal(profile.pendingSkinPurchase, pendingSkinPurchase);
});
