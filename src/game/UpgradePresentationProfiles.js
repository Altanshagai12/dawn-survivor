const families = [
  ['pyro', 12, 'fire', ['pyro_mage', 'fire_starter', 'intense_burn', 'soothing_warmth'], ['shot', 'status', 'impact']],
  ['frost', 13, 'ice', ['frost_mage', 'frostbite', 'ice_shard', 'shatter'], ['projectile', 'status', 'impact']],
  ['electro', 14, 'electric', ['electro_mage', 'electro_bug', 'energized', 'electro_mastery'], ['shot', 'status', 'summon']],
  ['ghost', 6, 'spirit', ['ghost_friend', 'energetic_friends', 'in_sync', 'vengeful_ghost'], ['summon', 'shot']],
  ['weaponry', 10, 'metal', ['light_weaponry', 'heavy_weaponry', 'sharpen', 'dual_wield'], ['summon', 'impact']],
  ['power', 10, 'power', ['power_shot', 'splinter', 'big_shot', 'reaper_rounds'], ['projectile', 'impact']],
  ['multi', 11, 'multi', ['double_shot', 'fan_fire', 'split_fire', 'fusillade'], ['muzzle', 'projectile']],
  ['rapid', 6, 'rapid', ['rapid_fire', 'light_bullets', 'rubber_bullets', 'siege'], ['shot', 'trail']],
  ['reload', 8, 'reload', ['quick_hands', 'armed_and_ready', 'fresh_clip', 'kill_clip'], ['reload', 'shot']],
  ['health', 0, 'body', ['vitality', 'giant', 'anger_point', 'regeneration'], ['hero']],
  ['movement', 15, 'movement', ['haste', 'blazing_speed', 'run_and_gun', 'in_the_wind'], ['hero', 'trail']],
  ['shield', 0, 'shield', ['holy_shield', 'divine_blessing', 'divine_wrath', 'stalwart_shield'], ['hero', 'status']],
  ['tome', 7, 'tome', ['tome_of_summoning', 'tome_of_rage', 'tome_of_power'], ['hero', 'muzzle', 'impact', 'audio']],
];

let presentationOrdinal = 0;
export const UPGRADE_PRESENTATION = Object.freeze(Object.fromEntries(families.flatMap(
  ([family, frame, audio, ids, channels]) => ids.map((id, tier) => {
    const ordinal = presentationOrdinal++;
    return [id, Object.freeze({
      id, family, frame, audio, channels: Object.freeze([...channels]), tier: tier + 1,
      signature: ordinal / 50, audioRate: .84 + ordinal / 50 * .34,
      rotation: ((ordinal * 5) % 16) / 16 * Math.PI * 2,
    })];
  }),
)));

export function upgradePresentation(id) {
  return UPGRADE_PRESENTATION[id] || null;
}

function owns(owned, id) { return Boolean(owned?.has?.(id)); }

export function activePresentationRecipe(state) {
  const owned = state?.owned || new Set();
  const tiers = {};
  Object.values(UPGRADE_PRESENTATION).forEach((entry) => {
    if (owns(owned, entry.id)) tiers[entry.family] = (tiers[entry.family] || 0) + 1;
  });
  const tomeTier = tiers.tome || 0;
  return {
    tiers,
    powerScale: 1 + Math.min(.72, (tiers.power || 0) * .09 + tomeTier * .16),
    trailRate: Math.min(3, (tiers.rapid || 0) + (tiers.movement || 0) + tomeTier),
    multiTier: tiers.multi || 0,
    reloadTier: tiers.reload || 0,
    heroTier: (tiers.health || 0) + (tiers.movement || 0) + (tiers.shield || 0) + tomeTier,
    fire: Boolean(tiers.pyro || state?.flags?.burnChanceAdd || state?.weapon?.burnChance),
    frost: Boolean(tiers.frost || state?.flags?.freezeChanceAdd),
    electric: Boolean(tiers.electro || state?.flags?.electroCadence),
    spirit: Boolean(tiers.ghost || tiers.weaponry),
    ricochet: owns(owned, 'rubber_bullets'),
    pierce: owns(owned, 'reaper_rounds') || owns(owned, 'tome_of_power'),
    splinter: owns(owned, 'splinter'),
    siege: owns(owned, 'siege'),
    freshClip: state?.elapsed < state?.freshUntil,
    audioAccents: Object.keys(tiers).filter((family) => tiers[family] > 0),
  };
}

export function presentationCoverage(upgrades) {
  return upgrades.map(({ id }) => ({ id, presentation: upgradePresentation(id) }));
}
