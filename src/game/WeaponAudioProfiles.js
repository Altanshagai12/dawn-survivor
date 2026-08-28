import { activePresentationRecipe } from './UpgradePresentationProfiles.js?build=20260828e';

export const WEAPON_SOUND_PROFILES = Object.freeze({
  revolver: Object.freeze({ type: 'square', from: 210, to: 72, duration: .09, gain: .15, low: 1600 }),
  shotgun: Object.freeze({ type: 'triangle', from: 112, to: 38, duration: .18, gain: .22, low: 760 }),
  crossbow: Object.freeze({ type: 'triangle', from: 780, to: 145, duration: .12, gain: .12, low: 2900 }),
  flame: Object.freeze({ type: 'sawtooth', from: 126, to: 52, duration: .22, gain: .1, low: 980 }),
});

export const AUDIO_BANK_EVENTS = Object.freeze({
  revolver: 3, shotgun: 3, crossbow: 3, flame: 3,
  impact: 2, reload: 2, ricochet: 2, elemental: 2, upgrade: 2, dash: 2,
});

export function weaponSoundProfile(weaponId, skin = null, state = null) {
  const base = WEAPON_SOUND_PROFILES[weaponId] || WEAPON_SOUND_PROFILES.revolver;
  const recipe = activePresentationRecipe(state);
  const rapidTier = recipe.tiers.rapid || 0;
  const multiTier = recipe.tiers.multi || 0;
  const elementalTier = (recipe.tiers.pyro || 0) + (recipe.tiers.frost || 0) + (recipe.tiers.electro || 0);
  const upgradeMix = {
    from: base.from * (1 + rapidTier * .025 + (recipe.electric ? .035 : 0)),
    to: base.to * (1 + elementalTier * .018),
    duration: base.duration * Math.max(.72, 1 - rapidTier * .035 + multiTier * .018),
    gain: base.gain * Math.min(1.34, recipe.powerScale * (1 + multiTier * .025)),
    low: base.low * (1 + (recipe.tiers.power || 0) * .035),
  };
  if (!skin) return { ...base, ...upgradeMix, accents: recipe.audioAccents };
  const pitch = skin.weaponPitch || 1;
  return {
    ...base, ...upgradeMix,
    from: upgradeMix.from * pitch,
    to: upgradeMix.to * pitch,
    gain: upgradeMix.gain * 1.06,
    low: upgradeMix.low * pitch,
    premium: true,
    accents: recipe.audioAccents,
    powerScale: recipe.powerScale,
    multiTier: recipe.multiTier,
  };
}

export function specialAudioEvent(event) {
  if (event === 'ricochet' || event === 'pierce') return 'ricochet';
  if (event === 'fan' || event === 'rear' || event === 'splinter') return 'impact';
  if (event === 'ice' || event === 'fireball' || event === 'lightning' || event === 'explosion') return 'elemental';
  if (event === 'dash') return 'dash';
  return 'impact';
}
