import { weaponArtForSkin } from '../data/skins.js?build=20260903d';
import { hasWeaponSkinAccess, normalizeWeaponSkinProfile, selectedWeaponSkin, setWeaponSkin, weaponSkinOptions } from '../data/weaponSkins.js?build=20260903d';
import { WeaponPurchaseModal } from './WeaponPurchaseModal.js?build=20260903d';
import { heroPassiveCopy } from './uiFormatters.js?build=20260828a';
import { bindSkinSwipe } from './skinSwipe.js?build=20260902b';

const COPY = {
  en: { original: 'Original', previous: 'Previous skin', next: 'Next skin',
    swipe: 'Swipe to preview a skin', buy: '500₮ · Buy', equipped: 'In use', equip: 'Equip', audio: 'Play weapon sound', saved: 'Loadout saved', saving: 'Saving…',
    failed: 'Could not save. Tap to retry.' },
  mn: { original: 'Энгийн', previous: 'Өмнөх skin', next: 'Дараах skin',
    swipe: 'Swipe хийж skin үзнэ', buy: '500₮ · Авах', equipped: 'Идэвхтэй', equip: 'Идэвхжүүлэх', audio: 'Бууны дуу сонсох', saved: 'Сонголт хадгалагдлаа', saving: 'Хадгалж байна…',
    failed: 'Хадгалсангүй. Дарж дахин оролдоно уу.' },
};

// Decision-making copy must stay visible on touch screens, not only in a tooltip.
const ABILITIES = {
  reroll: { en: 'Reroll · once per level', mn: 'Reroll · level бүр 1 удаа' },
  highHp: { en: 'Starts with 6 HP', mn: '6 амьтай эхэлнэ' },
  fireWave: { en: 'Every 3rd shot → fire', mn: '3 дахь буудалт бүр → гал' },
  dashClone: { en: 'Dash → shooting clone', mn: 'Dash → бууддаг хуулбар' },
};

export class WeaponLoadoutController {
  constructor({ ui, platform, commerce }) {
    this.ui = ui;
    this.platform = platform;
    this.commerce = commerce;
    this.browsedSkins = new Map();
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
      button.dataset.ability = hero.passive;
      const ability = ABILITIES[hero.passive][this.ui.i18n.lang === 'mn' ? 'mn' : 'en'];
      button.innerHTML = `<img src="${hero.portrait}" alt="" draggable="false" />
        <span class="hero-option__copy"><span class="hero-option__heading"><strong>${this.name(hero)}</strong>
        <span class="hero-option__health">♥ ${hero.hp}</span></span>
        <span class="hero-option__ability" id="hero-ability-${hero.id}">${ability}</span></span>`;
      button.setAttribute('aria-label', this.name(hero));
      button.setAttribute('aria-describedby', `hero-ability-${hero.id}`);
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
        <button type="button" class="weapon-buy"></button>
        <button type="button" class="weapon-audio">♪</button></div>
        <div class="skin-pagination" aria-hidden="true"></div>`;
      const stage = card.querySelector('.weapon-stage');
      const select = () => this.selectWeapon(weapon.id);
      card.querySelector('.weapon-select').addEventListener('click', select);
      card.querySelector('.weapon-select').title = this.ui.i18n.lang === 'mn' ? weapon.descriptionMn : weapon.description;
      stage.addEventListener('click', () => {
        if (this.ui.selectedWeapon === weapon.id && this.previewSkin(weapon.id)) this.activatePreview(weapon.id);
        else select();
      });
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
      card.querySelector('.weapon-buy').addEventListener('click', () => this.activatePreview(weapon.id));
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
    const current = this.previewSkin(weaponId);
    const index = options.findIndex((skin) => (skin?.id || null) === (current?.id || null));
    const next = options[(index + step + options.length) % options.length];
    this.browsedSkins.set(weaponId, next?.id || null);
    const equipped = setWeaponSkin(this.profile, weaponId, next?.id || null);
    this.stopAudio();
    this.render();
    if (equipped) this.save();
  }

  previewSkin(weaponId) {
    if (!this.browsedSkins.has(weaponId)) return selectedWeaponSkin(this.profile, weaponId);
    return weaponSkinOptions(this.profile, weaponId).find((skin) => skin?.id === this.browsedSkins.get(weaponId)) || null;
  }

  isPreviewLocked(weaponId) {
    return !hasWeaponSkinAccess(this.profile, weaponId, this.previewSkin(weaponId)?.id || null);
  }

  openShop(weaponId) {
    const skin = this.previewSkin(weaponId);
    if (!skin || !this.commerce) return;
    this.stopAudio();
    this.shop ||= new WeaponPurchaseModal({ profile: this.profile, commerce: this.commerce,
      weapons: this.ui.weapons, i18n: this.ui.i18n, onChange: () => this.render() });
    this.shop.open(weaponId, skin);
  }

  activatePreview(weaponId) {
    if (this.ui.selectedWeapon !== weaponId) return;
    if (this.isPreviewLocked(weaponId)) return this.openShop(weaponId);
    if (setWeaponSkin(this.profile, weaponId, this.previewSkin(weaponId)?.id || null)) {
      this.render();
      this.save();
    }
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
    const skin = this.previewSkin(weapon.id);
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
    const buy = card.querySelector('.weapon-buy');
    const locked = this.isPreviewLocked(weapon.id);
    card.classList.toggle('skin-locked', locked);
    buy.hidden = !skin;
    const equipped = selectedWeaponSkin(this.profile, weapon.id)?.id === skin?.id;
    buy.textContent = locked ? this.copy.buy : equipped ? this.copy.equipped : this.copy.equip;
    buy.disabled = !selected || (!locked && equipped);
    buy.setAttribute('aria-label', `${skinName} · ${this.name(weapon)} · ${buy.textContent}`);
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
    const skin = this.previewSkin(weaponId);
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
