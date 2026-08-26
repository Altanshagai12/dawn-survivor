const COPY = {
  en: {
    loading: 'Preparing the night…', tagline: 'Aim. Build. Survive until dawn.',
    hunter: 'Hunter', weapon: 'Weapon', begin: 'ENTER THE NIGHT',
    controls: 'WASD + mouse · dual touch sticks', untilDawn: 'UNTIL DAWN',
    chooseUpgrade: 'Choose an upgrade', reroll: 'REROLL', paused: 'Paused',
    resume: 'RESUME', endRun: 'END RUN', survived: 'SURVIVED', score: 'SCORE', kills: 'KILLS',
    level: 'LEVEL', again: 'PLAY AGAIN', loadout: 'CHANGE LOADOUT',
  },
  mn: {
    loading: 'Шөнийг бэлтгэж байна…', tagline: 'Оньсого. Хүчирхэгж. Үүр цайтал амьд үлд.',
    hunter: 'Баатар', weapon: 'Зэвсэг', begin: 'ШӨНӨ РҮҮ ОРОХ',
    controls: 'WASD + хулгана · хос touch joystick', untilDawn: 'ҮҮР ЦАЙХАД',
    chooseUpgrade: 'Сайжруулалтаа сонго', reroll: 'ШИНЭЧЛЭХ', paused: 'Түр зогслоо',
    resume: 'ҮРГЭЛЖЛҮҮЛЭХ', endRun: 'ТОГЛОЛТ ДУУСГАХ', survived: 'АМЬД ҮЛДСЭН', score: 'ОНОО', kills: 'УСТГАЛ',
    level: 'ТҮВШИН', again: 'ДАХИН ТОГЛОХ', loadout: 'СОНГОЛТ СОЛИХ',
  },
};

export function createI18n(language) {
  const lang = language?.toLowerCase().startsWith('mn') ? 'mn' : 'en';
  const t = (key) => COPY[lang][key] || COPY.en[key] || key;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  return { lang, t };
}
