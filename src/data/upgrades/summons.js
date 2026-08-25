export const SUMMON_TREES = [
  ['dragon', 'DRAGON', 'ЛУУ', [
    ['Dragon Egg','Лууны өндөг','Summon an egg that hatches in 3 minutes.','3 минутын дараа хагарах лууны өндөг дуудна.',{}, {dragonEgg:true}],
    ['Aged Dragon','Өссөн луу','Dragon gains 15 damage every 60 seconds.','Луу 60 секунд тутам 15 гэмтэл авна.',{}, {agedDragon:true}],
    ['Trained Dragon','Сургасан луу','Dragon gains 10% attack speed every 60 seconds.','Луу 60 секунд тутам 10% хурд авна.',{}, {trainedDragon:true}],
    ['Dragon Bond','Лууны холбоо','Bullets gain 10% of Dragon damage.','Сум лууны гэмтлийн 10%-г нэмнэ.',{}, {dragonBond:true}],
  ]],
  ['ghost', 'GHOST FRIEND', 'СҮНСЭН НӨХӨР', [
    ['Ghost Friend','Сүнсэн нөхөр','Summon a ghost that fires piercing shots for 8 damage.','8 гэмтэлтэй нэвтлэх сум бууддаг сүнс дуудна.',{}, {ghostFriend:true}],
    ['Best Friends','Дотны нөхөд','Fire rate +10%; ghost scales with your fire rate.','Галлах хурд +10%; сүнс таны хурдаар эрчимжинэ.',{fireRateMul:.1},{ghostBestFriends:true}],
    ['Ghost Wizard','Сүнсэн шидтэн','Ghost shots burn for 6 damage per second.','Сүнсний сум секундэд 6 шатаах гэмтэл өгнө.',{}, {ghostBurn:true}],
    ['Vengeful Ghost','Өшөөт сүнс','Ghost fires one additional projectile.','Сүнс нэг нэмэлт сум буудна.',{}, {ghostProjectilesAdd:1}],
  ]],
  ['lens', 'MAGIC LENS', 'ШИДЭТ ЛИНЗ', [
    ['Magic Lens','Шидэт линз','Bullets through the lens gain 30% damage and size.','Линзээр нэвтэрсэн сум 30% гэмтэл, хэмжээ авна.',{}, {magicLens:true}],
    ['Igniting Lens','Гал асаах линз','Lens bullets inflict Burn.','Линзээр нэвтэрсэн сум шатаана.',{}, {lensBurn:true}],
    ['Refraction','Хугарал','Lens bullets gain +2 bounce.','Линзээр нэвтэрсэн сум +2 удаа ойно.',{}, {lensBounceAdd:2}],
    ['Focal Point','Фокус цэг','Double lens effects; lens size is halved.','Линзний нөлөө 2 дахин, хэмжээ хагас болно.',{}, {lensDouble:true}],
  ]],
  ['scythe', 'MAGIC SCYTHE', 'ШИДЭТ ХАДУУР', [
    ['Magic Scythe','Шидэт хадуур','Summon an orbiting scythe for 40 damage.','40 гэмтэлтэй эргэлдэх хадуур дуудна.',{}, {magicScythe:true}],
    ['Shadowblade','Сүүдрийн ир','Scythe inflicts Curse; curse damage +15%.','Хадуур хараана; хараалын гэмтэл +15%.',{}, {scytheCurse:true,curseDamageMulAdd:.15}],
    ['Windcutter','Салхи зүсэгч','Move speed +10%; scythe scales with movement.','Хурд +10%; хадуур хөдөлгөөний хурдаар хүчжинэ.',{moveSpeedMul:.1},{scytheMoveScale:true}],
    ['Scythe Mastery','Хадуурын мастер','Damage +10%; scythe scales with bullet damage.','Гэмтэл +10%; хадуур сумны хүчээр эрчимжинэ.',{damageMul:.1},{scytheDamageScale:true}],
  ]],
  ['spear', 'MAGIC SPEAR', 'ШИДЭТ ЖАД', [
    ['Magic Spear','Шидэт жад','Summon 2 spears that deal 20 damage.','20 гэмтэлтэй 2 жад дуудна.',{}, {magicSpears:true}],
    ['Holy Spear','Ариун жад','Spears gain +10 damage per max HP.','Жад дээд HP тутам +10 гэмтэл авна.',{}, {spearHpScale:true}],
    ['Soul Drain','Сүнс сорох','Every 500 summon kills drops a Soul Heart.','Сүнсний 500 аллага тутам Soul Heart унагана.',{}, {summonSoulDrain:true}],
    ['Soul Knight','Сүнсэн хүлэг','Spears gain +15 damage per Soul Heart gained.','Жад авсан Soul Heart тутам +15 гэмтэл авна.',{}, {spearSoulScale:true}],
  ]],
  ['trainer', 'TRAINER', 'СУРГАГЧ', [
    ['Trainer','Сургагч','Summon damage +30%.','Дагуулын гэмтэл +30%.',{summonDamageMul:.3}],
    ['Pulsing Summons','Цохилох дагуул','Summon damage +20%; pulse nearby enemies every 2s.','Дагуулын гэмтэл +20%; 2 сек тутам ойрын дайсныг цохино.',{summonDamageMul:.2},{summonPulse:true}],
    ['Feed the Beasts','Араатны тэжээл','Summon damage +1% every 15 kills.','15 аллага тутам дагуулын гэмтэл +1%.',{}, {feedBeasts:true}],
    ['Bloodsuckers','Цус сорогч','Summon damage +10%; summon kills can heal.','Дагуулын гэмтэл +10%; аллага эдгээх боломжтой.',{summonDamageMul:.1},{summonHeal:true}],
  ]],
  ['frenzy', 'FRENZY', 'ГАЛЗУУРАЛ', [
    ['Frenzy','Галзуурал','Summon attack speed +30%.','Дагуулын довтлох хурд +30%.',{summonRateMul:.3}],
    ['Hellspawns','Тамын үр','Summon speed +20%; summon hits burn.','Дагуулын хурд +20%; цохилт нь шатаана.',{summonRateMul:.2},{summonBurn:true}],
    ['Thunderspawns','Аянгын үр','Summon speed +20%; 30% lightning chance.','Дагуулын хурд +20%; 30% аянгын магадлал.',{summonRateMul:.2},{summonLightning:.3}],
    ['Culling','Хядлага','Summon speed +15%; 15% execute chance.','Дагуулын хурд +15%; 15% шууд устгах магадлал.',{summonRateMul:.15},{summonExecute:.15}],
  ]],
];
