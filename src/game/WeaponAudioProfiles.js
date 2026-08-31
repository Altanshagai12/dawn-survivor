import { activePresentationRecipe } from './UpgradePresentationProfiles.js?build=20260828e';

export const WEAPON_SOUND_PROFILES = Object.freeze({
  revolver: Object.freeze({
    type: 'square', from: 255, to: 58, duration: .115, gain: .2,
    low: 1850, sub: 68, crack: 3900, tail: .12, punch: .13,
  }),
  shotgun: Object.freeze({
    type: 'triangle', from: 132, to: 32, duration: .24, gain: .3,
    low: 680, sub: 45, crack: 1450, tail: .24, punch: .22,
  }),
  crossbow: Object.freeze({
    type: 'triangle', from: 980, to: 118, duration: .145, gain: .18,
    low: 3400, sub: 110, crack: 5200, tail: .15, punch: .1,
  }),
  flame: Object.freeze({
    type: 'sawtooth', from: 152, to: 38, duration: .28, gain: .16,
    low: 840, sub: 42, crack: 1100, tail: .3, punch: .16,
  }),
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
    sub: base.sub * (1 + (recipe.tiers.power || 0) * .015),
    crack: base.crack * (1 + elementalTier * .012),
    tail: base.tail * Math.min(1.25, 1 + multiTier * .04),
    punch: base.punch * Math.min(1.3, recipe.powerScale),
  };
  if (!skin) return { ...base, ...upgradeMix, accents: recipe.audioAccents };
  const pitch = skin.weaponPitch || 1;
  return {
    ...base, ...upgradeMix,
    from: upgradeMix.from * pitch,
    to: upgradeMix.to * pitch,
    gain: upgradeMix.gain * 1.06,
    low: upgradeMix.low * pitch,
    sub: upgradeMix.sub * pitch,
    crack: upgradeMix.crack * pitch,
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
