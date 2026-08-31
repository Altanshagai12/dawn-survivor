import assert from 'node:assert/strict';
import test from 'node:test';
import { WEAPONS } from '../src/data/weapons.js';
import {
  MAX_SHOT_AUDIO_SOURCES, PremiumWeaponAudio, weaponSoundProfile,
} from '../src/game/PremiumWeaponAudio.js';
import { weaponEffectProfile, weaponShotAngles } from '../src/game/WeaponPresentation.js';

test('all four weapons have distinct visual and sound identities', () => {
  const ids = Object.keys(WEAPONS);
  const visuals = ids.map((id) => JSON.stringify(weaponEffectProfile(id)));
  const sounds = ids.map((id) => JSON.stringify(weaponSoundProfile(id)));
  assert.equal(new Set(visuals).size, 4);
  assert.equal(new Set(sounds).size, 4);
  ids.forEach((id) => {
    const sound = weaponSoundProfile(id);
    assert.ok(sound.punch >= .1);
    assert.ok(sound.sub < sound.from);
    assert.ok(sound.crack > sound.from);
  });
});

test('shotgun presentation emits four short branches across its authored cone', () => {
  const angles = weaponShotAngles(WEAPONS.shotgun, 0);
  assert.equal(angles.length, 4);
  assert.ok(Math.abs((angles.at(-1) - angles[0]) * 180 / Math.PI - 38) < 1e-9);
  assert.ok(weaponEffectProfile('shotgun').tracer < weaponEffectProfile('revolver').tracer);
});

test('crossbow owns the longest tracer while flame owns a dedicated profile', () => {
  assert.ok(weaponEffectProfile('crossbow').tracer > weaponEffectProfile('revolver').tracer);
  assert.equal(weaponEffectProfile('flame').color, 0xffa13d);
});

test('every weapon profile has a deliberately amplified visual footprint', () => {
  Object.keys(WEAPONS).forEach((id) => {
    const profile = weaponEffectProfile(id);
    assert.ok(profile.visualScale >= 1.2);
    assert.ok(profile.tracer >= 40);
  });
});

test('weapon audio fails safely when Web Audio is unavailable', () => {
  const audio = new PremiumWeaponAudio({});
  assert.equal(audio.unlock(), false);
  assert.equal(audio.play('revolver'), false);
  assert.doesNotThrow(() => audio.destroy());
});

test('one shot stays within the constrained mobile audio source budget', () => {
  assert.equal(MAX_SHOT_AUDIO_SOURCES, 3);
});
