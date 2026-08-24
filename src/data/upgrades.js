const TREE_ICONS = {
  power: '✹', rapid: '»', reload: '↻', aim: '◉', haste: '➜', vitality: '♥',
  magnet: '◆', fire: '♨', frost: '❄', storm: 'ϟ', shield: '⬡', summon: '☾', blast: '✸',
};

function makeTree(id, label, labelMn, rows) {
  return rows.map(([name, nameMn, desc, descMn, mods = {}, set = {}], index) => ({
    id: `${id}-${index + 1}`, tree: id, treeLabel: label, treeLabelMn: labelMn,
    tier: index + 1, icon: TREE_ICONS[id], name, nameMn, desc, descMn, mods, set,
    requires: index === 0 ? [] : [`${id}-${index}`],
  }));
}

const trees = [
  makeTree('power', 'POWER', 'ХҮЧ', [
    ['Impact Rounds','Хүчтэй сум','Bullet damage +25%.','Сумны гэмтэл +25%.',{damageMul:.25}],
    ['Heavy Caliber','Хүнд калибр','Damage +25%, size +35%, fire rate -10%.','Гэмтэл +25%, хэмжээ +35%, галлах хурд -10%.',{damageMul:.25,bulletSizeMul:.35,fireRateMul:-.1}],
    ['Splinter','Хэлтэрхий','Kills release 3 weaker bullets.','Устгасан дайснаас 3 жижиг сум гарна.',{}, {splinter:true}],
    ['Executioner','Цаазлагч','Damage +20%; execute enemies below 20% HP.','Гэмтэл +20%; 20%-с доош HP-тэй дайсныг устгана.',{damageMul:.2},{execute:.2}],
  ]),
  makeTree('rapid', 'RAPID', 'ХУРД', [
    ['Quick Trigger','Хурдан гох','Fire rate +25%.','Галлах хурд +25%.',{fireRateMul:.25}],
    ['Double Shot','Хос буудалт','One extra projectile; damage -10%, spread +10°.','Нэг нэмэлт сум; гэмтэл -10%, тархалт +10°.',{damageMul:-.1,projectilesAdd:1,spreadAdd:10}],
    ['Rubber Bullets','Ойдог сум','Bullets ricochet to one more enemy.','Сум нэг нэмэлт дайсан руу ойно.',{bounceAdd:1}],
    ['Fusillade','Сумны шуурга','Double all projectiles; spread +12°.','Бүх сум хоёр дахин олширно; тархалт +12°.',{spreadAdd:12},{fusillade:true}],
  ]),
  makeTree('reload', 'RELOAD', 'ЦЭНЭГ', [
    ['Quick Hands','Шуурхай гар','Reload speed +25%.','Цэнэглэх хурд +25%.',{reloadMul:.25}],
    ['Deep Pockets','Гүн халаас','Ammo capacity +40%.','Сумны багтаамж +40%.',{ammoMul:.4}],
    ['Fan Fire','Тойрог гал','The last round releases 10 bullets in a circle.','Сүүлийн сум 10 сумыг тойргоор цацна.',{}, {fanFire:true}],
    ['Fresh Magazine','Шинэ дайз','First 4 shots after reload deal +60% damage.','Цэнэглэсний дараах 4 сум +60% гэмтэлтэй.',{}, {freshClip:true}],
  ]),
  makeTree('aim', 'AIM', 'ОНОЛТ', [
    ['True Aim','Жинхэнэ оноо','Projectile speed +30%, spread -15%.','Сумны хурд +30%, тархалт -15%.',{projectileSpeedMul:.3,spreadMul:-.15}],
    ['Penetrator','Нэвтлэгч','Piercing +1, projectile speed +15%.','Нэвтрэлт +1, сумны хурд +15%.',{pierceAdd:1,projectileSpeedMul:.15}],
    ['Split Fire','Арын буудалт','Every shot fires a second bullet behind you.','Буудалт бүр арагш нэг нэмэлт сум гаргана.',{}, {backShot:true}],
    ['Perfect Line','Төгс шугам','Critical chance +20%.','Critical магадлал +20%.',{critChanceAdd:.2}],
  ]),
  makeTree('haste', 'HASTE', 'ШАЛАМГАЙ', [
    ['Swift Step','Шуурхай алхам','Movement speed +20%.','Хөдөлгөөний хурд +20%.',{moveSpeedMul:.2}],
    ['Run and Gun','Гүйж буудах','Remove the movement penalty while firing.','Буудаж байх үеийн хурдны хасалтыг арилгана.',{}, {runGun:true}],
    ['Tailwind','Арын салхи','Move speed +15%; dodge +8%.','Хурд +15%; бултах магадлал +8%.',{moveSpeedMul:.15},{dodgeAdd:.08}],
    ['Untouchable','Баригдашгүй','Moving continuously builds up to +30% damage.','Тасралтгүй хөдлөхөд гэмтэл 30% хүртэл өснө.',{}, {momentumDamage:true}],
  ]),
  makeTree('vitality', 'VITALITY', 'АМЬ', [
    ['Vital Spark','Амийн оч','Max HP +1 and heal 1.','Дээд HP +1, 1 HP эдгэнэ.',{maxHpAdd:1,heal:1}],
    ['Recovery','Сэргэлт','Heal 1 HP every 90 seconds.','90 секунд тутам 1 HP эдгэнэ.',{}, {regenSeconds:90}],
    ['Giant Heart','Аварга зүрх','Max HP +2, character size +12%.','Дээд HP +2, дүрийн хэмжээ +12%.',{maxHpAdd:2,sizeMul:.12}],
    ['Last Breath','Сүүлчийн амьсгал','Survive one fatal hit and heal 2.','Нэг үхлийн цохилтыг тэсэж 2 HP эдгэнэ.',{}, {lastBreath:true}],
  ]),
  makeTree('magnet', 'GROWTH', 'ӨСӨЛТ', [
    ['Ember Reach','Цог таталт','Pickup range +45%.','Татах хүрээ +45%.',{pickupMul:.45}],
    ['Fast Learner','Хурдан суралцагч','Experience gain +20%.','Туршлага +20%.',{xpMul:.2}],
    ['Magnetic Pulse','Соронзон долгион','Every 20 seconds pull all nearby embers.','20 секунд тутам ойрын бүх цогийг татна.',{}, {magnetPulse:true}],
    ['Knowledge Is Power','Мэдлэг бол хүч','Every level grants +2% damage.','Түвшин бүр +2% гэмтэл өгнө.',{}, {levelDamage:true}],
  ]),
  makeTree('fire', 'PYRE', 'ГАЛ', [
    ['Kindle','Асаалт','Bullets have 25% chance to burn.','Сум 25% магадлалаар шатаана.',{}, {burnChanceAdd:.25}],
    ['Intense Flame','Хүчтэй дөл','Burn damage +75%.','Шаталтын гэмтэл +75%.',{burnDamageMul:.75}],
    ['Fire Bloom','Галын дэлбээ','Burning enemies explode on death.','Шатаж буй дайсан үхэхдээ дэлбэрнэ.',{}, {burnExplosion:true}],
    ['Phoenix Blood','Галт шувуу','Every 80 burn kills heal 1 HP.','Шаталтаар 80 дайсан устгахад 1 HP эдгэнэ.',{}, {burnHeal:true}],
  ]),
  makeTree('frost', 'FROST', 'МӨС', [
    ['Cold Touch','Хүйтэн хүрэлт','Bullets have 20% chance to freeze.','Сум 20% магадлалаар хөлдөөнө.',{}, {freezeChanceAdd:.2}],
    ['Frostbite','Хөлдөлт','Frozen enemies lose 15% current HP.','Хөлдсөн дайсан одоогийн HP-ийн 15%-г алдана.',{}, {frostbite:.15}],
    ['Shatter','Хагарал','Frozen enemies explode on death.','Хөлдсөн дайсан үхэхдээ дэлбэрнэ.',{}, {shatter:true}],
    ['Endless Winter','Мөнхийн өвөл','Freeze chance +20%, duration +50%.','Хөлдөөх магадлал +20%, хугацаа +50%.',{}, {freezeChanceAdd:.2,freezeDurationMul:.5}],
  ]),
  makeTree('storm', 'STORM', 'АЯНГА', [
    ['Static Shot','Цахилгаан сум','Hits have 20% chance to call lightning.','Оносон сум 20% магадлалаар аянга дуудна.',{}, {lightningChanceAdd:.2}],
    ['Charged Air','Цэнэгт агаар','Lightning damage +50%.','Аянгын гэмтэл +50%.',{lightningDamageMul:.5}],
    ['Chain Spark','Гинжин оч','Lightning chains to one more target.','Аянга нэг нэмэлт дайсан руу дамжина.',{}, {lightningChainsAdd:1}],
    ['Thunder God','Аянгын эзэн','Every 5th shot calls lightning.','5 дахь сум бүр аянга дуудна.',{}, {guaranteedLightning:5}],
  ]),
  makeTree('shield', 'WARD', 'ХАМГААЛАЛТ', [
    ['Moon Ward','Сарны бамбай','Block one hit; recharges in 90 seconds.','Нэг цохилт хаана; 90 секундэд сэргэнэ.',{}, {shield:true}],
    ['Blessing','Ивээл','Shield recharge time -30 seconds.','Бамбай сэргэх хугацаа -30 секунд.',{}, {shieldRechargeAdd:-30}],
    ['Retribution','Хариу цохилт','Breaking the shield damages nearby enemies.','Бамбай хагарахад ойрын дайсанд гэмтэл өгнө.',{}, {shieldBurst:true}],
    ['Radiant Ward','Гэрэлт бамбай','While shielded, fire rate +30%.','Бамбайтай үед галлах хурд +30%.',{}, {shieldFire:true}],
  ]),
  makeTree('summon', 'SPIRIT', 'СҮНС', [
    ['Night Wisp','Шөнийн сүнс','Summon a wisp that fires nearby enemies.','Ойрын дайсан руу бууддаг сүнс дуудна.',{}, {wispsAdd:1}],
    ['Energized','Эрчимжсэн','Summon attack speed +35%.','Сүнсний довтлох хурд +35%.',{summonRateMul:.35}],
    ['Twin Souls','Хос сүнс','Summon one additional wisp.','Нэг нэмэлт сүнс дуудна.',{}, {wispsAdd:1}],
    ['Vengeful Host','Өшөөт сүрэг','Summon damage +75%.','Сүнсний гэмтэл +75%.',{summonDamageMul:.75}],
  ]),
  makeTree('blast', 'BLAST', 'ТЭСРЭЛТ', [
    ['Force Rounds','Түлхэх сум','Knockback +35%.','Түлхэх хүч +35%.',{knockbackMul:.35}],
    ['Blast Core','Тэсрэх цөм','10% chance for bullets to explode.','Сум 10% магадлалаар дэлбэрнэ.',{}, {explosionChanceAdd:.1}],
    ['Wide Ruin','Өргөн сүйрэл','Explosion radius +45%.','Дэлбэрэлтийн хүрээ +45%.',{explosionRadiusMul:.45}],
    ['Aftershock','Дараах цохилт','Explosions deal +50% damage.','Дэлбэрэлтийн гэмтэл +50%.',{explosionDamageMul:.5}],
  ]),
];

export const UPGRADES = trees.flat();

export function eligibleUpgrades(owned) {
  return UPGRADES.filter((upgrade) => !owned.has(upgrade.id)
    && upgrade.requires.every((id) => owned.has(id)));
}
