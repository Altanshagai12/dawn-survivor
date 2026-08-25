export const DEFENSE_TREES = [
  ['health', 'HEALTH', 'АМЬ', [
    ['Vitality','Амьдрал','Max HP +1.','Дээд HP +1.',{maxHpAdd:1}],
    ['Anger Point','Уурын цэг','Taking damage grants +75% damage and fire rate for 30s.','Гэмтэхэд 30 сек гэмтэл, галлах хурд +75%.',{}, {angerPoint:true}],
    ['Giant','Аварга','Max HP +2, character size +25%.','Дээд HP +2, дүрийн хэмжээ +25%.',{maxHpAdd:2,sizeMul:.25}],
    ['Regeneration','Нөхөн төлжилт','Heal 1 HP every 90 seconds.','90 секунд тутам 1 HP эдгэнэ.',{}, {regenSeconds:90}],
  ]],
  ['shield', 'HOLY SHIELD', 'АРИУН БАМБАЙ', [
    ['Holy Shield','Ариун бамбай','Block one hit; regenerates in 2 minutes.','Нэг цохилт хаана; 2 минутад сэргэнэ.',{}, {shield:true,shieldRechargeSeconds:120}],
    ['Divine Blessing','Тэнгэрийн ивээл','While shielded, reload and move speed +25%.','Бамбайтай үед цэнэглэлт, хөдөлгөөн +25%.',{}, {shieldBlessing:true}],
    ['Divine Wrath','Тэнгэрийн хилэн','While shielded, strike one nearby enemy each second.','Бамбайтай үед секунд бүр нэг дайсанд аянга буулгана.',{}, {shieldWrath:true}],
    ['Stalwart Shield','Бат бамбай','Shield now regenerates in 1 minute.','Бамбай 1 минутад сэргэнэ.',{}, {shieldRechargeSeconds:60}],
  ]],
  ['dodge', 'DODGE', 'БУЛТАЛТ', [
    ['Evasive','Бултамтгай','Dodge +20%.','Бултах магадлал +20%.',{}, {dodgeAdd:.2}],
    ['Nimble','Шаламгай','Dodge +10%, move speed +10%.','Булталт +10%, хөдөлгөөний хурд +10%.',{moveSpeedMul:.1},{dodgeAdd:.1}],
    ['Tiny','Жижиг','Dodge +5%, character size -25%.','Булталт +5%, дүрийн хэмжээ -25%.',{sizeMul:-.25},{dodgeAdd:.05}],
    ['Reflex','Рефлекс','Move speed +15%; dodge scales with move speed.','Хурд +15%; булталт хөдөлгөөний хурдаар өснө.',{moveSpeedMul:.15},{reflex:true}],
  ]],
  ['soul', 'SOUL HEART', 'СҮНСЭН ЗҮРХ', [
    ['Soul Shield','Сүнсэн бамбай','Gain a Soul Heart; gain another every 90s, max 3.','Soul Heart авна; 90 сек тутам дахин авна, дээд 3.',{}, {soulHeartAdd:1,soulRegen:true}],
    ['Soul Expand','Сүнс тэлэх','Gain a Soul Heart; max Soul Hearts +2.','Soul Heart авна; дээд хэмжээ +2.',{}, {soulHeartAdd:1,soulHeartMaxAdd:2}],
    ['Soul Powered','Сүнсний хүч','Bullets gain 10% damage per current Soul Heart.','Одоогийн Soul Heart тутам сумны гэмтэл +10%.',{}, {soulPowered:true}],
    ['Soul Link','Сүнсний холбоо','Losing a Soul Heart removes 80% max HP from non-bosses.','Soul Heart алдахад босоос бусдын дээд HP-ийн 80%-г хасна.',{}, {soulLink:true}],
  ]],
];
