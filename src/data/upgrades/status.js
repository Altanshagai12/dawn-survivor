export const STATUS_TREES = [
  ['electro', 'ELECTROMANCY', 'ЦАХИЛГААН', [
    ['Electro Mage','Цахилгаан шидтэн','Every 2nd shot calls lightning for 22 damage.','2 дахь сум бүр 22 гэмтэлтэй аянга дуудна.',{}, {electroCadence:2}],
    ['Electro Bug','Цахилгаан цох','Summon a bug that strikes 2 nearby enemies.','Ойрын 2 дайсанд аянга буулгах цох дуудна.',{}, {electroBug:true}],
    ['Energized','Цэнэгжсэн','Lightning has 20% chance to refill 3 ammo.','Аянга 20% магадлалаар 3 сум цэнэглэнэ.',{}, {lightningAmmo:true}],
    ['Electro Mastery','Аянгын мастер','Lightning damage +12, area +75%.','Аянгын гэмтэл +12, хүрээ +75%.',{}, {lightningFlatAdd:12,lightningAreaMul:.75}],
  ]],
  ['ice', 'ICE', 'МӨС', [
    ['Frost Mage','Мөсний шидтэн','Bullets have 35% chance to Freeze.','Сум 35% магадлалаар хөлдөөнө.',{}, {freezeChanceAdd:.35}],
    ['Frostbite','Хөлдөлт','Freeze removes 15% max HP; 1% from bosses.','Хөлдөлт дээд HP-ийн 15%, босоос 1%-г хасна.',{}, {frostbite:.15}],
    ['Ice Shard','Мөсөн хэлтэрхий','Last ammo fires 3 freezing shards.','Сүүлийн сум 3 хөлдөөх хэлтэрхий цацна.',{}, {iceShard:true}],
    ['Shatter','Хагарал','Frozen kills explode for 7% max HP damage.','Хөлдсөн дайсан 7% дээд HP гэмтэлтэй дэлбэрнэ.',{}, {shatter:true}],
  ]],
  ['pyro', 'PYROMANCY', 'ГАЛЫН ШИД', [
    ['Pyro Mage','Галын шидтэн','Bullets have 50% chance to Burn for 3 DPS.','Сум 50% магадлалаар секундэд 3 шатаана.',{}, {burnChanceAdd:.5}],
    ['Fire Starter','Гал асаагч','Every 5th shot launches a 40-damage fireball.','5 дахь сум бүр 40 гэмтэлтэй галт бөмбөг гаргана.',{}, {fireballCadence:5}],
    ['Intense Burn','Хүчтэй шаталт','Burn damage +35%.','Шаталтын гэмтэл +35%.',{burnDamageMul:.35}],
    ['Soothing Warmth','Дулаан илч','Inflicting Burn has a small chance to heal 1 HP.','Шатаах бүр бага магадлалаар 1 HP эдгээнэ.',{}, {burnHealChance:.0005}],
  ]],
  ['dark', 'DARK ARTS', 'ХАР ШИД', [
    ['Dark Arts','Хар шид','Bullets have 35% chance to inflict Curse.','Сум 35% магадлалаар хараана.',{}, {curseChanceAdd:.35}],
    ['Doom','Мөхөл','Curse gains +100% bullet damage.','Хараал сумны гэмтлийн +100%-г авна.',{}, {curseDamageMulAdd:1}],
    ['Wither','Гандах','Cursed enemies take 30% more damage.','Хараагдсан дайсан 30% илүү гэмтэл авна.',{}, {wither:true}],
    ['Ritual','Ёслол','Every 10 Curse kills adds 1% bullet damage.','Хараалын 10 аллага тутам сумны гэмтэл +1%.',{}, {ritual:true}],
  ]],
  ['holy', 'HOLY ARTS', 'АРИУН ШИД', [
    ['Holy Arts','Ариун шид','Last ammo Smites nearby enemies for 20 damage.','Сүүлийн сум ойрын дайсанд 20 Smite гэмтэл өгнө.',{}, {smite:true}],
    ['Holy Might','Ариун хүч','Smite gains +10 damage per current HP.','Smite одоогийн HP тутам +10 гэмтэл авна.',{}, {smiteHpScale:true}],
    ['Justice','Шударга ёс','Every 500 Smite kills grants max HP, up to 3.','Smite-ийн 500 аллага тутам дээд HP +1, дээд тал 3.',{}, {smiteMaxHp:true}],
    ['Angelic','Тэнгэрлэг','Every 500 Smite kills heals 1 HP.','Smite-ийн 500 аллага тутам 1 HP эдгээнэ.',{}, {smiteHeal:true}],
  ]],
];
