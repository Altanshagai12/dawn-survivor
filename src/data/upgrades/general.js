export const GENERAL_TREES = [
  ['magnet', 'MAGNET XP', 'СОРОНЗ', [
    ['Magnetism','Соронзон','Pickup range +50%.','Татах хүрээ +50%.',{pickupMul:.5}],
    ['Recharge','Дахин цэнэг','Pickup +20%; gems have 10% chance to refill 1 ammo.','Таталт +20%; цог 10% магадлалаар 1 сум цэнэглэнэ.',{pickupMul:.2},{gemAmmoChance:.1}],
    ['Watch & Learn','Ажиглаж сур','Pickup +30%, vision +25%.','Таталт +30%, харах хүрээ +25%.',{pickupMul:.3,visionMul:.25}],
    ['Excitement','Хөөрөл','Pickup +30%; collecting XP grants +50% fire rate for 1s.','Таталт +30%; XP авахад 1 сек галлах хурд +50%.',{pickupMul:.3},{excitement:true}],
  ]],
  ['speed', 'SPEED BOOST', 'ХУРД', [
    ['Haste','Яаралт','Move speed +20%, fire rate +5%.','Хөдөлгөөн +20%, галлах хурд +5%.',{moveSpeedMul:.2,fireRateMul:.05}],
    ['Blazing Speed','Дөлт хурд','Move speed +10%; burn nearby enemies while running.','Хөдөлгөөн +10%; гүйхдээ ойрын дайсныг шатаана.',{moveSpeedMul:.1},{blazingSpeed:true}],
    ['Run and Gun','Гүйж бууд','Remove movement penalty while firing.','Буудаж байх хөдөлгөөний хасалтыг арилгана.',{}, {runGun:true}],
    ['In the Wind','Салхинд','Every 10s gain +10% damage and speed, max 40%; reset on hit.','10 сек тутам гэмтэл, хурд +10%, дээд 40%; цохилтод арилна.',{}, {inTheWind:true}],
  ]],
  ['vision', 'VISION', 'ХАРАА', [
    ['Glare','Ширтэлт','Vision +25%; nearby enemies take 15 damage each second.','Хараа +25%; ойрын дайсан секунд бүр 15 гэмтэнэ.',{visionMul:.25},{glare:true}],
    ['Intense Glare','Хүчтэй ширтэлт','Vision +25%; Glare damage doubles.','Хараа +25%; ширтэлтийн гэмтэл 2 дахин.',{visionMul:.25},{intenseGlare:true}],
    ['Sight Magic','Харааны шид','Vision +15%; Glare applies bullet on-hit effects.','Хараа +15%; ширтэлт сумны on-hit нөлөө хэрэглэнэ.',{visionMul:.15},{sightMagic:true}],
    ['Saccade','Үсрэлтэт хараа','Vision +25%; Glare triggers twice as often.','Хараа +25%; ширтэлт 2 дахин ойр давтамжтай.',{visionMul:.25},{saccade:true}],
  ]],
  ['aero', 'AERO', 'САЛХИН ШИД', [
    ['Aero Magic','Салхин шид','Every 2s release a Gale dealing 20 damage.','2 сек тутам 20 гэмтэлтэй салхи гаргана.',{}, {aeroMagic:true}],
    ['Windborne','Салхин жигүүр','Move speed +15%; Gale scales with move speed.','Хөдөлгөөн +15%; салхи хөдөлгөөний хурдаар хүчжинэ.',{moveSpeedMul:.15},{galeMoveScale:true}],
    ['Eye of the Storm','Шуурганы нүд','Every 2s deal double Gale damage nearby; Gale +5.','2 сек тутам ойр орчимд 2 дахин гэмтэл; салхи +5.',{}, {eyeStorm:true,galeFlatAdd:5}],
    ['Aero Mastery','Салхины мастер','Gale damage +15.','Салхины гэмтэл +15.',{}, {galeFlatAdd:15}],
  ]],
];
