export const COMBAT_TREES = [
  ['aim', 'FAST BULLETS', 'ХУРДАН СУМ', [
    ['Take Aim','Онилгоо','Bullet speed +30%, spread -15°.','Сумны хурд +30%, тархалт -15°.',{projectileSpeedMul:.3,spreadAdd:-15}],
    ['Penetration','Нэвтрэлт','Bullet speed +15%, piercing +1.','Сумны хурд +15%, нэвтрэлт +1.',{projectileSpeedMul:.15,pierceAdd:1}],
    ['Sniper','Мэргэн','Bullet speed +25%, damage +15%.','Сумны хурд +25%, гэмтэл +15%.',{projectileSpeedMul:.25,damageMul:.15}],
    ['Assassin','Алуурчин','Execute enemies below 20% HP.','20%-с доош HP-тэй дайсныг шууд устгана.',{}, {execute:.2}],
  ]],
  ['power', 'BULLET DAMAGE', 'СУМНЫ ХҮЧ', [
    ['Power Shot','Хүчтэй сум','Damage +40%, knockback +20%.','Гэмтэл +40%, түлхэлт +20%.',{damageMul:.4,knockbackMul:.2}],
    ['Big Shot','Том сум','Damage +45%, bullet size +40%.','Гэмтэл +45%, сумны хэмжээ +40%.',{damageMul:.45,bulletSizeMul:.4}],
    ['Splinter','Хэлтэрхий','Kills release 3 bullets for 10% damage.','Устгасан дайснаас 10% гэмтэлтэй 3 сум гарна.',{}, {splinter:true}],
    ['Reaper Rounds','Үхлийн сум','Damage +20%, piercing +1; pierce killed enemies.','Гэмтэл +20%, нэвтрэлт +1; үхсэн дайсныг нэвтэлнэ.',{damageMul:.2,pierceAdd:1},{pierceKilled:true}],
  ]],
  ['rapid', 'FIRE RATE', 'ГАЛЛАХ ХУРД', [
    ['Rapid Fire','Түргэн гал','Fire rate +25%.','Галлах хурд +25%.',{fireRateMul:.25}],
    ['Light Bullets','Хөнгөн сум','Fire rate +15%, ammo +1, bullet speed +15%.','Галлах хурд +15%, сум +1, сумны хурд +15%.',{fireRateMul:.15,ammoAdd:1,projectileSpeedMul:.15}],
    ['Rubber Bullets','Ойдог сум','Bullet bounce +1, fire rate +10%.','Сум нэг удаа ойно, галлах хурд +10%.',{bounceAdd:1,fireRateMul:.1}],
    ['Siege','Бэхлэлт','Standing shots have 40% chance not to consume ammo.','Зогсож буудахад сум хорогдохгүй магадлал 40%.',{}, {siege:true}],
  ]],
  ['double', 'MULTI SHOT', 'ОЛОН СУМ', [
    ['Double Shot','Хос буудалт','Projectiles +1, spread +10°, damage -10%.','Сум +1, тархалт +10°, гэмтэл -10%.',{damageMul:-.1,projectilesAdd:1,spreadAdd:10}],
    ['Fan Fire','Тойрог гал','Last ammo fires 10 bullets around you for 15% damage.','Сүүлийн сум 15% гэмтэлтэй 10 сум тойргоор цацна.',{}, {fanFire:true}],
    ['Split Fire','Арын буудалт','Shoot one additional bullet behind you.','Буудалт бүр арагш нэг сум гаргана.',{}, {backShot:true}],
    ['Fusillade','Сумны шуурга','Double base projectiles; +1 projectile, spread +15°, damage -25%.','Үндсэн сум 2 дахин; сум +1, тархалт +15°, гэмтэл -25%.',{damageMul:-.25,projectilesAdd:1,spreadAdd:15},{fusillade:true}],
  ]],
  ['reload', 'RELOAD BOOST', 'ЦЭНЭГЛЭЛТ', [
    ['Quick Hands','Шуурхай гар','Reload rate +20%, fire rate +5%.','Цэнэглэх хурд +20%, галлах хурд +5%.',{reloadMul:.2,fireRateMul:.05}],
    ['Armed and Ready','Бэлэн зэвсэг','Reload rate +10%, max ammo +2.','Цэнэглэх хурд +10%, сумны багтаамж +2.',{reloadMul:.1,ammoAdd:2}],
    ['Fresh Clip','Шинэ дайз','Reload +5%; damage +50% for 1 second after reload.','Цэнэглэлт +5%; цэнэглэснээс хойш 1 сек гэмтэл +50%.',{reloadMul:.05},{freshClip:true}],
    ['Kill Clip','Аллагын дайз','Each kill adds 5% reload rate until reloading.','Аллага бүр цэнэглэх хүртэл цэнэглэлтийн хурд +5%.',{}, {killClip:true}],
  ]],
];
