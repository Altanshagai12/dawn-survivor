export const UPGRADE_CHOICE_COUNT = 5;

const n = (id, name, nameMn, desc, descMn, mods = {}, set = {}) => ({
  id, name, nameMn, desc, descMn, mods, set,
});

const TREE_SPECS = [
  ['pyro', 'Pyro', 'Гал', [
    n('pyro_mage', 'Pyro Mage', 'Галын шидтэн', 'Bullets have 50% Burn chance.', 'Сум 50% магадлалаар 4 секунд шатаана.', {}, { burnChanceAdd: .5 }),
    n('fire_starter', 'Fire Starter', 'Гал асаагч', 'Every 4th shot launches a 40-damage Fireball.', '4 дэх галлалт бүр 40 гэмтэлтэй Fireball гаргана.', {}, { fireballCadence: 4 }),
    n('intense_burn', 'Intense Burn', 'Хүчтэй шаталт', 'Burn Damage +35%.', 'Шаталтын гэмтэл +35%.', { burnDamageMul: .35 }),
    n('soothing_warmth', 'Soothing Warmth', 'Эдгээх дулаан', 'Burn infliction has 0.5% chance to heal 1 HP.', 'Шатаах бүр 0.5% магадлалаар 1 амь нөхнө.', {}, { burnHealChance: .005 }),
  ]],
  ['frost', 'Frost', 'Хяруу', [
    n('frost_mage', 'Frost Mage', 'Хярууны шидтэн', 'Bullets have 35% Freeze chance.', 'Сум 35% магадлалаар дайсныг хөлдөөнө.', {}, { freezeChanceAdd: .35 }),
    n('frostbite', 'Frostbite', 'Хөлдөлтийн шарх', 'Freeze removes 25% normal Max HP; 1% boss Max HP.', 'Хөлдөлт энгийн дайсны 25%, боссын 1% дээд амийг хасна.', {}, { frostbite: true }),
    n('ice_shard', 'Ice Shard', 'Мөсөн хэлтэрхий', 'Final ammo releases 3 freezing Ice Shards.', 'Сүүлийн сум 3 хөлдөөгч мөсөн хэлтэрхий гаргана.', {}, { iceShard: true }),
    n('shatter', 'Shatter', 'Бутралт', 'Frozen kills explode for 25% Max HP.', 'Хөлдсөн дайсан үхэхдээ дээд амийн 25%-ийн дэлбэрэлт үүсгэнэ.', {}, { shatter: true }),
  ]],
  ['electro', 'Electro', 'Цахилгаан', [
    n('electro_mage', 'Electro Mage', 'Цахилгаан шидтэн', 'Every 2nd shot triggers 22-damage Lightning.', '2 дахь галлалт бүр 22 гэмтэлтэй аянга буулгана.', {}, { electroCadence: 2 }),
    n('electro_bug', 'Electro Bug', 'Цахилгаан шавж', 'Summon a bug that shocks 2 nearby enemies.', 'Ойрын 2 дайсанд аянга буулгах шавж дуудна.', {}, { electroBug: true }),
    n('energized', 'Energized', 'Цэнэгжсэн', 'Lightning has 20% chance to refill 3 ammo.', 'Аянга 20% магадлалаар 3 сум нөхнө.', {}, { lightningAmmo: true }),
    n('electro_mastery', 'Electro Mastery', 'Цахилгааны мастер', 'Lightning Damage +12 and AoE +75%.', 'Аянгын гэмтэл +12, талбай +75%.', { lightningDamageAdd: 12, lightningAreaMul: .75 }),
  ]],
  ['ghost', 'Ghost Friend', 'Сүнсэн найз', [
    n('ghost_friend', 'Ghost Friend', 'Сүнсэн найз', 'Summon a friend firing piercing 22-damage shots.', '22 гэмтэлтэй нэвт сум буудах сүнсэн найз дуудна.', {}, { ghostFriend: true }),
    n('energetic_friends', 'Energetic Friends', 'Эрчтэй найзууд', 'Summon Attack Speed +50%.', 'Дуудлагын довтлох хурд +50%.', { summonRateMul: .5 }),
    n('in_sync', 'In Sync', 'Нэг хэмнэл', 'Summon Damage and Attack Speed +15%; Ghost follows aim.', 'Дуудлагын гэмтэл, хурд +15%; сүнс онилтыг дагана.', { summonDamageMul: .15, summonRateMul: .15 }, { ghostSync: true }),
    n('vengeful_ghost', 'Vengeful Ghost', 'Өшөөт сүнс', 'Summon Damage +15%; Ghost fires 2 more projectiles.', 'Дуудлагын гэмтэл +15%; сүнс 2 нэмэлт сум буудна.', { summonDamageMul: .15 }, { ghostProjectilesAdd: 2 }),
  ]],
  ['weaponry', 'Magic Weapon', 'Шидэт зэвсэг', [
    n('light_weaponry', 'Light Weaponry', 'Хөнгөн зэвсэг', 'Summon a seeking Magic Dagger.', 'Дайсныг мөрдөх шидэт хутга дуудна.', {}, { magicDagger: true }),
    n('heavy_weaponry', 'Heavy Weaponry', 'Хүнд зэвсэг', 'Summon an orbiting Magic Scythe.', 'Эргэлдэх шидэт хадуур дуудна.', {}, { magicScythe: true }),
    n('sharpen', 'Sharpen', 'Ирлэх', 'Summon Damage +40%.', 'Дуудлагын гэмтэл +40%.', { summonDamageMul: .4 }),
    n('dual_wield', 'Dual Wield', 'Хос зэвсэг', 'Summon a second Magic Dagger.', 'Хоёр дахь шидэт хутгыг дуудна.', {}, { daggerCount: 2 }),
  ]],
  ['power', 'Bullet Damage', 'Сумны хүч', [
    n('power_shot', 'Power Shot', 'Хүчтэй сум', 'Bullet Damage +25%; Knockback +20%.', 'Сумны гэмтэл +25%, түлхэлт +20%.', { damageMul: .25, knockbackMul: .2 }),
    n('splinter', 'Splinter', 'Хэлтэрхий', 'Bullet kills release 3 bullets at 15% base damage.', 'Сумаар устгахад 15% гэмтэлтэй 3 хэлтэрхий гарна.', {}, { splinter: true }),
    n('big_shot', 'Big Shot', 'Том сум', 'Damage +35%, Size +40%, Fire Rate -16%.', 'Гэмтэл +35%, хэмжээ +40%, галлах хурд -16%.', { damageMul: .35, bulletSizeMul: .4, fireRateMul: -.16 }),
    n('reaper_rounds', 'Reaper Rounds', 'Хураагч сум', 'Damage +15%, Pierce +1; kills preserve pierce.', 'Гэмтэл +15%, нэвтлэх +1; устгасан дайсанд нэвтлэлт үлдэнэ.', { damageMul: .15, pierceAdd: 1 }, { pierceKilled: true }),
  ]],
  ['multi', 'Multi Shot', 'Олон сум', [
    n('double_shot', 'Double Shot', 'Давхар сум', 'Projectile +1, Spread +15, Damage -10%.', 'Сум +1, тархалт +15, гэмтэл -10%.', { projectilesAdd: 1, spreadAdd: 15, damageMul: -.1 }),
    n('fan_fire', 'Fan Fire', 'Тойрог гал', 'Final ammo releases 10 bullets around you.', 'Сүүлийн сум эргэн тойронд 10 сум гаргана.', {}, { fanFire: true }),
    n('split_fire', 'Split Fire', 'Арын гал', 'Fire 1 additional projectile behind you.', 'Арагш 1 нэмэлт сум буудна.', {}, { backShot: true }),
    n('fusillade', 'Fusillade', 'Нягт гал', 'Projectile +1, Spread +15, Damage -25%; doubles base projectiles.', 'Сум +1, тархалт +15, гэмтэл -25%; үндсэн сумыг хоёр дахин өсгөнө.', { projectilesAdd: 1, spreadAdd: 15, damageMul: -.25 }, { fusillade: true }),
  ]],
  ['rapid', 'Fire Rate', 'Галлах хурд', [
    n('rapid_fire', 'Rapid Fire', 'Хурдан гал', 'Fire Rate +25%.', 'Галлах хурд +25%.', { fireRateMul: .25 }),
    n('light_bullets', 'Light Bullets', 'Хөнгөн сум', 'Fire Rate +15%, Max Ammo +1, Bullet Speed +15%.', 'Галлах хурд +15%, сум +1, сумны хурд +15%.', { fireRateMul: .15, ammoAdd: 1, projectileSpeedMul: .15 }),
    n('rubber_bullets', 'Rubber Bullets', 'Ойдог сум', 'Bounce +1, Fire Rate +10%, Damage -10%.', 'Ойлт +1, галлах хурд +10%, гэмтэл -10%.', { bounceAdd: 1, fireRateMul: .1, damageMul: -.1 }),
    n('siege', 'Siege', 'Бэхлэлт', 'Standing shots have 33% chance to consume no ammo.', 'Зогсож буудахад 33% магадлалаар сум зарцуулахгүй.', {}, { siege: true }),
  ]],
  ['reload', 'Reload', 'Цэнэглэлт', [
    n('quick_hands', 'Quick Hands', 'Шуурхай гар', 'Reload Rate +20%, Fire Rate +5%.', 'Цэнэглэх хурд +20%, галлах хурд +5%.', { reloadMul: .2, fireRateMul: .05 }),
    n('armed_and_ready', 'Armed & Ready', 'Бэлэн зэвсэг', 'Reload Rate +10%, Max Ammo +2.', 'Цэнэглэх хурд +10%, сум +2.', { reloadMul: .1, ammoAdd: 2 }),
    n('fresh_clip', 'Fresh Clip', 'Шинэ дайз', 'Reload Rate +5%; reload grants +30% Damage for 1s.', 'Цэнэглэх хурд +5%; дараа нь 1 секунд гэмтэл +30%.', { reloadMul: .05 }, { freshClip: true }),
    n('kill_clip', 'Kill Clip', 'Устгалын дайз', 'Each kill adds +5% Reload until the next reload.', 'Устгал бүр дараагийн цэнэглэлт хүртэл хурдыг +5% өсгөнө.', {}, { killClip: true }),
  ]],
  ['health', 'Health', 'Амь', [
    n('vitality', 'Vitality', 'Амьдрал', 'Max HP +1.', 'Дээд амь +1.', { maxHpAdd: 1 }),
    n('giant', 'Giant', 'Аварга', 'Max HP +2, Size +50%, Move Speed -16%.', 'Дээд амь +2, хэмжээ +50%, хөдөлгөөн -16%.', { maxHpAdd: 2, playerSizeMul: .5, moveSpeedMul: -.16 }),
    n('anger_point', 'Anger Point', 'Уур хилэн', 'Taking damage grants +50% Fire Rate for 15s.', 'Гэмтэл авахад 15 секунд галлах хурд +50%.', {}, { angerPoint: true }),
    n('regeneration', 'Regeneration', 'Нөхөн төлжилт', 'Restore 1 HP every 90 seconds.', '90 секунд тутам 1 амь нөхнө.', {}, { regeneration: true }),
  ]],
  ['movement', 'Movement', 'Хөдөлгөөн', [
    n('haste', 'Haste', 'Хурд', 'Move Speed +20%, Fire Rate +5%.', 'Хөдөлгөөн +20%, галлах хурд +5%.', { moveSpeedMul: .2, fireRateMul: .05 }),
    n('blazing_speed', 'Blazing Speed', 'Дөлөн хурд', 'Move Speed +10%; movement burns nearby enemies.', 'Хөдөлгөөн +10%; гүйхдээ ойрын дайсныг шатаана.', { moveSpeedMul: .1 }, { blazingSpeed: true }),
    n('run_and_gun', 'Run & Gun', 'Гүйнгээ бууд', 'Walk Speed while firing +100%.', 'Буудаж явах хурд +100%.', { walkSpeedMul: 1 }),
    n('in_the_wind', 'In the Wind', 'Салхинд', 'Every 10s unharmed adds +10% Damage and Move, up to +40%.', 'Гэмтэлгүй 10 секунд бүр гэмтэл, хөдөлгөөн +10%; дээд нь +40%.', {}, { inTheWind: true }),
  ]],
  ['shield', 'Holy Shield', 'Ариун бамбай', [
    n('holy_shield', 'Holy Shield', 'Ариун бамбай', 'Block 1 hit; regenerates after 120 seconds.', '1 цохилт хааж, 120 секундын дараа сэргэнэ.', {}, { holyShield: true }),
    n('divine_blessing', 'Divine Blessing', 'Тэнгэрийн ивээл', 'While shielded: Reload and Move Speed +25%.', 'Бамбайтай үед цэнэглэлт, хөдөлгөөн +25%.', {}, { divineBlessing: true }),
    n('divine_wrath', 'Divine Wrath', 'Тэнгэрийн хилэн', 'While shielded: 22-damage Lightning each second.', 'Бамбайтай үед секунд бүр 22 гэмтэлтэй аянга бууна.', {}, { divineWrath: true }),
    n('stalwart_shield', 'Stalwart Shield', 'Бат бамбай', 'Shield regeneration reduced to 60 seconds.', 'Бамбай 60 секундэд сэргэнэ.', {}, { stalwartShield: true }),
  ]],
];

export const UPGRADE_ICON_FRAMES = Object.freeze({
  pyro_mage: 56, fire_starter: 57, intense_burn: 58, soothing_warmth: 59,
  frost_mage: 52, frostbite: 53, ice_shard: 54, shatter: 55,
  electro_mage: 48, electro_bug: 49, energized: 50, electro_mastery: 51,
  ghost_friend: 24, energetic_friends: 25, in_sync: 26, vengeful_ghost: 27,
  light_weaponry: 36, heavy_weaponry: 32, sharpen: 35, dual_wield: 36,
  power_shot: 4, splinter: 6, big_shot: 5, reaper_rounds: 7,
  double_shot: 12, fan_fire: 13, split_fire: 14, fusillade: 15,
  rapid_fire: 8, light_bullets: 9, rubber_bullets: 10, siege: 11,
  quick_hands: 16, armed_and_ready: 17, fresh_clip: 18, kill_clip: 19,
  vitality: 68, giant: 70, anger_point: 69, regeneration: 71,
  haste: 88, blazing_speed: 89, run_and_gun: 90, in_the_wind: 91,
  holy_shield: 72, divine_blessing: 73, divine_wrath: 74, stalwart_shield: 75,
  tome_of_summoning: 40, tome_of_rage: 44, tome_of_power: 4,
});

function makeTree([tree, treeLabel, treeLabelMn, nodes]) {
  const rootId = nodes[0].id;
  const tier2Ids = [nodes[1].id, nodes[2].id];
  return nodes.map((upgrade, index) => ({
    ...upgrade, type: 'normal', tree, treeLabel, treeLabelMn,
    tier: index === 0 ? 1 : index === 3 ? 3 : 2,
    iconFrame: UPGRADE_ICON_FRAMES[upgrade.id],
    requires: index === 0 ? [] : index === 3 ? [] : [rootId],
    requiresAny: index === 3 ? tier2Ids : [],
  }));
}

export const UPGRADE_TREES = TREE_SPECS.map(makeTree);
export const NORMAL_UPGRADES = UPGRADE_TREES.flat();
UPGRADE_TREES.forEach((tree) => tree.forEach((item) => { item.treeNodes = tree.map(({ id }) => id); }));
export const UPGRADES = NORMAL_UPGRADES;

export const TOMES = [
  n('tome_of_summoning', 'Tome of Summoning', 'Дуудлагын судар', 'Summon Damage and Attack Speed +50%; Reload Rate -50%.', 'Дуудлагын гэмтэл, хурд +50%; цэнэглэлт -50%.', { summonDamageMul: .5, summonRateMul: .5, reloadMul: -.5 }),
  n('tome_of_rage', 'Tome of Rage', 'Хилэнгийн судар', 'Fire Rate +66%, Spread +60, base ammo ×3, Damage -50%, Knockback -95%.', 'Галлах хурд +66%, тархалт +60, үндсэн сум ×3, гэмтэл -50%, түлхэлт -95%.', { fireRateMul: .66, spreadAdd: 60, damageMul: -.5, knockbackMul: -.95 }, { baseAmmoMultiplier: 3 }),
  n('tome_of_power', 'Tome of Power', 'Хүчний судар', 'Damage +50%, Size +100%, Pierce +1, Fire Rate -25%, Max HP -1.', 'Гэмтэл +50%, хэмжээ +100%, нэвтлэлт +1, галлах хурд -25%, дээд амь -1.', { damageMul: .5, bulletSizeMul: 1, pierceAdd: 1, fireRateMul: -.25, maxHpAdd: -1 }),
].map((tome) => ({
  ...tome, type: 'tome', tier: 0, iconFrame: UPGRADE_ICON_FRAMES[tome.id], tree: 'tome', treeNodes: [],
}));

export const ALL_UPGRADES = [...NORMAL_UPGRADES, ...TOMES];

export function eligibleUpgrades(ownedOrState) {
  const owned = ownedOrState?.owned || ownedOrState || new Set();
  return NORMAL_UPGRADES.filter((upgrade) => !owned.has(upgrade.id)
    && upgrade.requires.every((id) => owned.has(id))
    && (!upgrade.requiresAny.length || upgrade.requiresAny.some((id) => owned.has(id))));
}

export function sampleUpgradeCards(ownedOrState, count = UPGRADE_CHOICE_COUNT, random = Math.random) {
  const pool = [...eligibleUpgrades(ownedOrState)];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
