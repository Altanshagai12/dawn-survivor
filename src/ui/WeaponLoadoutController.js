import { weaponArtForSkin } from '../data/skins.js?build=20260902d';
import { normalizeWeaponSkinProfile, selectedWeaponSkin, setWeaponSkin, weaponSkinOptions } from '../data/weaponSkins.js?build=20260902d';
import { heroPassiveCopy } from './uiFormatters.js?build=20260828a';
import { bindSkinSwipe } from './skinSwipe.js?build=20260902b';

const COPY = {
  en: { original: 'Original', previous: 'Previous skin', next: 'Next skin',
    swipe: 'Swipe to equip a skin', audio: 'Play weapon sound', saved: 'Loadout saved', saving: 'Saving…',
    failed: 'Could not save. Tap to retry.' },
  mn: { original: 'Энгийн', previous: 'Өмнөх skin', next: 'Дараах skin',
    swipe: 'Swipe хийж skin солино', audio: 'Бууны дуу сонсох', saved: 'Сонголт хадгалагдлаа', saving: 'Хадгалж байна…',
    failed: 'Хадгалсангүй. Дарж дахин оролдоно уу.' },
};

export class WeaponLoadoutController {
  constructor({ ui, platform }) {
    this.ui = ui;
    this.platform = platform;
    this.profile = normalizeWeaponSkinProfile(ui.profile);
    this.copy = COPY[ui.i18n.lang === 'mn' ? 'mn' : 'en'];
    this.saveQueue = Promise.resolve();
    this.saveRevision = 0;
    this.cards = new Map();
    this.heroButtons = new Map();
    this.buildHeroes();
    this.buildWeapons();
    this.saveStatus = document.getElementById('loadout-save');
    this.setSaveStatus('');
    this.saveStatus.addEventListener('click', () => this.save());
  }

  name(item) { return this.ui.i18n.lang === 'mn' ? item.nameMn : item.name; }

  buildHeroes() {
    const buttons = Object.values(this.ui.heroes).map((hero) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hero-option';
      button.dataset.hero = hero.id;
      button.innerHTML = `<img src="${hero.portrait}" alt="" draggable="false" />
        <span class="hero-option__copy"><strong>${this.name(hero)}</strong>
        <span>♥ ${hero.hp}</span></span><b class="selection-dot" aria-hidden="true"></b>`;
      button.setAttribute('aria-label', this.name(hero));
      button.title = heroPassiveCopy(hero, this.ui.i18n.lang);
      button.addEventListener('click', () => {
        this.ui.selectedHero = hero.id;
        this.profile.selectedHero = hero.id;
        this.render();
        this.save();
      });
      this.heroButtons.set(hero.id, button);
      return button;
    });
    this.ui.el['hero-list'].replaceChildren(...buttons);
  }

  buildWeapons() {
    const cards = Object.values(this.ui.weapons).map((weapon) => {
      const card = document.createElement('article');
      card.className = 'weapon-option';
      card.dataset.weapon = weapon.id;
      card.setAttribute('aria-label', this.name(weapon));
      card.innerHTML = `<button type="button" class="weapon-select"><span>
        <strong>${this.name(weapon)}</strong></span><b class="selection-dot" aria-hidden="true"></b></button>
        <div class="weapon-carousel"><button type="button" class="skin-arrow skin-arrow--previous">‹</button>
        <button type="button" class="weapon-stage"><img class="weapon-neighbor weapon-neighbor--previous" alt="" draggable="false" />
        <img class="weapon-art" alt="" draggable="false" /><img class="weapon-neighbor weapon-neighbor--next" alt="" draggable="false" /></button>
        <button type="button" class="skin-arrow skin-arrow--next">›</button></div>
        <div class="weapon-option__footer"><div><strong class="weapon-skin-name"></strong></div>
        <button type="button" class="weapon-audio">♪</button></div>
        <div class="skin-pagination" aria-hidden="true"></div>`;
      const stage = card.querySelector('.weapon-stage');
      const select = () => this.selectWeapon(weapon.id);
      card.querySelector('.weapon-select').addEventListener('click', select);
      card.querySelector('.weapon-select').title = this.ui.i18n.lang === 'mn' ? weapon.descriptionMn : weapon.description;
      stage.addEventListener('click', select);
      stage.setAttribute('aria-label', this.name(weapon));
      bindSkinSwipe(stage, {
        active: () => this.ui.selectedWeapon === weapon.id,
        rotated: () => document.documentElement.classList.contains('mobile-rotated'),
        change: (step) => this.cycleSkin(weapon.id, step),
      });
      for (const [direction, step] of [['previous', -1], ['next', 1]]) {
        const arrow = card.querySelector(`.skin-arrow--${direction}`);
        arrow.setAttribute('aria-label', `${this.copy[direction]} · ${this.name(weapon)}`);
        arrow.addEventListener('click', () => this.cycleSkin(weapon.id, step));
      }
      const audio = card.querySelector('.weapon-audio');
      audio.setAttribute('aria-label', `${this.copy.audio} · ${this.name(weapon)}`);
      audio.addEventListener('click', () => this.audition(weapon.id));
      this.cards.set(weapon.id, card);
      return card;
    });
    this.ui.el['weapon-list'].replaceChildren(...cards);
  }

  selectWeapon(weaponId) {
    if (this.ui.selectedWeapon === weaponId) return;
    this.stopAudio();
    this.ui.selectedWeapon = weaponId;
    this.profile.selectedWeapon = weaponId;
    this.render();
    this.save();
  }

  cycleSkin(weaponId, step) {
    if (this.ui.selectedWeapon !== weaponId) return;
    const options = weaponSkinOptions(this.profile, weaponId);
    const current = selectedWeaponSkin(this.profile, weaponId);
    const index = options.findIndex((skin) => (skin?.id || null) === (current?.id || null));
    const next = options[(index + step + options.length) % options.length];
    if (!setWeaponSkin(this.profile, weaponId, next?.id || null)) return;
    this.stopAudio();
    this.render();
    this.save();
  }

  render() {
    this.heroButtons.forEach((button, id) => {
      const selected = this.ui.selectedHero === id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.cards.forEach((card, id) => this.renderWeapon(card, this.ui.weapons[id]));
  }

  renderWeapon(card, weapon) {
    const selected = this.ui.selectedWeapon === weapon.id;
    const options = weaponSkinOptions(this.profile, weapon.id);
    const skin = selectedWeaponSkin(this.profile, weapon.id);
    const index = options.findIndex((item) => (item?.id || null) === (skin?.id || null));
    card.classList.toggle('selected', selected);
    card.dataset.skin = skin?.id || 'original';
    card.style.setProperty('--weapon-color', skin ? `#${skin.primary.toString(16).padStart(6, '0')}` : '#65e6ff');
    card.querySelector('.weapon-select').setAttribute('aria-pressed', String(selected));
    card.querySelector('.weapon-stage').setAttribute('aria-pressed', String(selected));
    const skinName = skin ? this.name(skin) : this.copy.original;
    card.querySelector('.weapon-stage').setAttribute('aria-label', `${this.name(weapon)} · ${skinName}${selected ? ` · ${this.copy.swipe}` : ''}`);
    for (const [selector, offset] of [['.weapon-art', 0], ['.weapon-neighbor--previous', -1], ['.weapon-neighbor--next', 1]]) {
      card.querySelector(selector).src = weaponArtForSkin(options[(index + offset + options.length) % options.length], weapon);
    }
    card.querySelector('.weapon-skin-name').textContent = skinName;
    card.querySelectorAll('.skin-arrow').forEach((button) => { button.disabled = !selected; });
    card.querySelector('.weapon-audio').disabled = !selected || !skin;
    card.querySelector('.skin-pagination').innerHTML = options.map((_, i) => `<i${i === index ? ' class="current"' : ''}></i>`).join('');
  }

  setSaveStatus(message, failed = false) {
    this.saveStatus.textContent = message;
    this.saveStatus.classList.toggle('hidden', !failed);
    this.saveStatus.disabled = !failed;
  }

  save() {
    const revision = ++this.saveRevision;
    this.setSaveStatus(this.copy.saving);
    this.saveQueue = this.saveQueue.catch(() => {}).then(() => this.platform.saveProfile(this.profile))
      .then((saved) => {
        if (revision === this.saveRevision) this.setSaveStatus(saved === false ? this.copy.failed : this.copy.saved, saved === false);
      })
      .catch(() => { if (revision === this.saveRevision) this.setSaveStatus(this.copy.failed, true); });
    return this.saveQueue;
  }

  audition(weaponId) {
    const skin = selectedWeaponSkin(this.profile, weaponId);
    if (!skin) return;
    this.stopAudio();
    this.audio = new Audio(`${skin.audioBank}/${weaponId}.wav?build=20260901b`);
    this.audio.volume = .55;
    this.audio.play().catch(() => {});
  }

  stopAudio() {
    this.audio?.pause();
    if (this.audio) this.audio.src = '';
    this.audio = null;
  }
}
