import { hasSkinAccess, selectedSkin, SKIN_ACCESS_MODE, SKINS_BY_HERO } from '../data/skins.js?build=20260901e';

const WEAPON_IDS = Object.freeze(['revolver', 'shotgun', 'crossbow', 'flame']);
const WEAPON_VFX_FRAMES = Object.freeze({ revolver: 1, shotgun: 2, crossbow: 3, flame: 4 });

const COPY = {
  en: {
    title: 'SKIN', default: 'Original', free: 'FREE TO TRY', owned: 'OWNED', equipped: 'EQUIPPED',
    preview: 'LIVE GAMEPLAY PREVIEW', buy: 'BUY', equip: 'EQUIP', equippedButton: 'EQUIPPED', close: 'CLOSE',
    prototype: 'FREE AAA PROTOTYPE', audition: 'PLAY WEAPON AUDIO', contents: 'HERO · 4 WEAPONS · VFX · AUDIO',
    buying: 'CONFIRM IN USIONS…', unavailable: 'Purchases are not online yet.',
    insufficient: 'Not enough Usions credits.', cancelled: 'Purchase cancelled.',
    retry: 'Payment is safe. Reopen this skin to finish delivery.',
  },
  mn: {
    title: 'SKIN', default: 'Энгийн', free: 'ҮНЭГҮЙ ТУРШИХ', owned: 'АВСАН', equipped: 'ӨМСӨЖ БУЙ',
    preview: 'ТОГЛООМ ДЭЭРХ БОДИТ ХАРАГДАЦ', buy: 'АВАХ', equip: 'ӨМСӨХ', equippedButton: 'ӨМСӨЖ БУЙ', close: 'ХААХ',
    prototype: 'ҮНЭГҮЙ AAA PROTOTYPE', audition: 'БУУНЫ ДУУ СОНСОХ', contents: 'БААТАР · 4 БУУ · VFX · ДУУ',
    buying: 'USIONS-Д БАТАЛГААЖУУЛНА УУ…', unavailable: 'Худалдан авах сервер хараахан бэлэн биш байна.',
    insufficient: 'Usions credit хүрэлцэхгүй байна.', cancelled: 'Худалдан авалт цуцлагдлаа.',
    retry: 'Төлбөр аюулгүй. Skin-ээ дахин нээж хүргэлтийг дуусгана уу.',
  },
};

function errorCopy(copy, code) {
  if (code === 'purchase-unavailable') return copy.unavailable;
  if (code === 'insufficient-credits') return copy.insufficient;
  if (code === 'payment-cancelled') return copy.cancelled;
  return copy.retry;
}

export class SkinShopController {
  constructor({ profile, i18n, platform, commerce, onSelectionChange = null }) {
    this.profile = profile;
    this.i18n = i18n;
    this.platform = platform;
    this.commerce = commerce;
    this.onSelectionChange = onSelectionChange;
    this.heroId = 'shana';
    this.openSkin = null;
    this.busy = false;
    this.previewWeaponId = 'revolver';
    this.previewTick = 0;
    this.previewTimer = null;
    this.previewAudio = null;
    this.el = Object.fromEntries([
      'skin-list', 'skin-section-title', 'skin-modal', 'skin-preview', 'skin-name', 'skin-description',
      'skin-price', 'skin-status', 'skin-action', 'skin-close', 'skin-eyebrow', 'skin-live-label',
      'skin-live-hero', 'skin-live-weapon', 'skin-live-vfx', 'skin-weapon-tabs', 'skin-audio-shot',
      'skin-contents',
    ].map((id) => [id, document.getElementById(id)]));
    this.el['skin-close'].addEventListener('click', () => this.close());
    this.el['skin-action'].addEventListener('click', () => this.activate());
    this.el['skin-audio-shot'].addEventListener('click', () => this.auditionShot());
  }

  get copy() { return COPY[this.i18n.lang === 'mn' ? 'mn' : 'en']; }

  selection(heroId = this.heroId) {
    return this.selected(heroId)?.id || null;
  }

  selected(heroId = this.heroId) { return selectedSkin(this.profile, heroId); }

  render(heroId) {
    this.heroId = heroId;
    const skins = SKINS_BY_HERO[heroId] || [];
    const equipped = this.selection(heroId);
    this.el['skin-section-title'].textContent = this.copy.title;
    const original = document.createElement('button');
    original.type = 'button';
    original.className = `skin-card skin-card--original${!equipped ? ' selected' : ''}`;
    original.innerHTML = `<b>✦</b><span>${this.copy.default}</span>${!equipped ? `<small>${this.copy.equipped}</small>` : ''}`;
    original.addEventListener('click', () => this.equip(null));

    const premiumCards = skins.map((skin) => {
      const premium = document.createElement('button');
      const name = this.i18n.lang === 'mn' ? skin.nameMn : skin.name;
      premium.type = 'button';
      premium.className = `skin-card skin-card--premium skin-card--${skin.rarity}${equipped === skin.id ? ' selected' : ''}`;
      const accessLabel = SKIN_ACCESS_MODE === 'free-preview' ? this.copy.free
        : this.profile.ownedSkins.includes(skin.id) ? this.copy.owned : `${skin.priceCredits} ◈`;
      premium.innerHTML = `<img src="${skin.cardArt}" alt="${name}"/><span>${name}</span><small>${equipped === skin.id ? this.copy.equipped : accessLabel}</small>`;
      premium.addEventListener('click', () => this.open(skin));
      return premium;
    });
    this.el['skin-list'].replaceChildren(original, ...premiumCards);
  }

  open(skin) {
    this.stopPreview();
    this.openSkin = skin;
    this.el['skin-preview'].src = skin.packArt;
    this.el['skin-preview'].alt = this.i18n.lang === 'mn' ? skin.nameMn : skin.name;
    this.el['skin-name'].textContent = this.i18n.lang === 'mn' ? skin.nameMn : skin.name;
    this.el['skin-description'].textContent = this.i18n.lang === 'mn' ? skin.descriptionMn : skin.description;
    this.el['skin-price'].textContent = SKIN_ACCESS_MODE === 'free-preview' ? this.copy.free : `${skin.priceCredits} ◈`;
    this.el['skin-eyebrow'].textContent = SKIN_ACCESS_MODE === 'free-preview'
      ? this.copy.prototype : `${skin.rarity.toUpperCase()} COSMETIC`;
    this.el['skin-live-label'].textContent = this.copy.preview;
    this.el['skin-contents'].textContent = this.copy.contents;
    this.el['skin-audio-shot'].textContent = this.copy.audition;
    this.el['skin-status'].textContent = '';
    this.el['skin-close'].textContent = this.copy.close;
    this.renderWeaponTabs();
    this.selectPreviewWeapon('revolver');
    this.startPreview();
    this.syncAction();
    this.el['skin-modal'].classList.remove('hidden');
  }

  close() {
    if (this.busy) return;
    this.el['skin-modal'].classList.add('hidden');
    this.disposePreviewMedia();
    this.openSkin = null;
  }

  renderWeaponTabs() {
    const skin = this.openSkin;
    const tabs = WEAPON_IDS.map((weaponId) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skin-weapon-tab';
      button.dataset.weapon = weaponId;
      button.setAttribute('aria-label', weaponId);
      button.innerHTML = `<img src="${skin.weaponArt[weaponId]}" alt="${weaponId}"/>`;
      button.addEventListener('click', () => this.selectPreviewWeapon(weaponId));
      return button;
    });
    this.el['skin-weapon-tabs'].replaceChildren(...tabs);
  }

  selectPreviewWeapon(weaponId) {
    if (!this.openSkin || !WEAPON_IDS.includes(weaponId)) return;
    this.previewWeaponId = weaponId;
    this.el['skin-weapon-tabs'].querySelectorAll('.skin-weapon-tab').forEach((button) => {
      button.classList.toggle('selected', button.dataset.weapon === weaponId);
    });
    this.el['skin-live-weapon'].src = this.openSkin.weaponArt[weaponId];
    const frame = WEAPON_VFX_FRAMES[weaponId];
    this.el['skin-live-vfx'].style.backgroundImage = `url("${this.openSkin.vfxAtlas}")`;
    this.el['skin-live-vfx'].style.backgroundPosition = `${frame % 4 / 3 * 100}% ${Math.floor(frame / 4) / 3 * 100}%`;
  }

  startPreview() {
    if (!this.openSkin) return;
    this.el['skin-live-hero'].style.backgroundImage = `url("${this.openSkin.heroAtlas.file}")`;
    this.previewTick = 0;
    const renderFrame = () => {
      const column = this.previewTick % 6;
      const row = Math.floor(this.previewTick / 12) % 8;
      this.el['skin-live-hero'].style.backgroundPosition = `${column / 5 * 100}% ${row / 7 * 100}%`;
      this.previewTick += 1;
    };
    renderFrame();
    this.previewTimer = setInterval(renderFrame, 90);
  }

  stopPreview() {
    clearInterval(this.previewTimer);
    this.previewTimer = null;
    this.previewAudio?.pause?.();
    if (this.previewAudio) this.previewAudio.src = '';
    this.previewAudio = null;
  }

  disposePreviewMedia() {
    this.stopPreview();
    this.el['skin-preview'].removeAttribute('src');
    this.el['skin-live-weapon'].removeAttribute('src');
    this.el['skin-live-hero'].style.backgroundImage = '';
    this.el['skin-live-vfx'].style.backgroundImage = '';
    this.el['skin-weapon-tabs'].replaceChildren();
  }

  auditionShot() {
    if (!this.openSkin) return;
    this.previewAudio?.pause?.();
    this.previewAudio = new Audio(`${this.openSkin.audioBank}/${this.previewWeaponId}.wav?build=20260901b`);
    this.previewAudio.volume = .55;
    this.previewAudio.play().catch(() => {});
  }

  syncAction() {
    const skin = this.openSkin;
    if (!skin) return;
    const accessible = hasSkinAccess(this.profile, skin.id);
    const equipped = this.selection(skin.heroId) === skin.id;
    this.el['skin-action'].disabled = this.busy || equipped;
    this.el['skin-action'].textContent = this.busy ? this.copy.buying
      : equipped ? this.copy.equippedButton : accessible ? this.copy.equip : `${this.copy.buy} · ${skin.priceCredits} ◈`;
  }

  async activate() {
    const skin = this.openSkin;
    if (!skin || this.busy) return;
    if (hasSkinAccess(this.profile, skin.id)) {
      await this.equip(skin.id);
      this.close();
      return;
    }
    this.busy = true;
    this.el['skin-status'].textContent = '';
    this.syncAction();
    try {
      await this.commerce.purchase(skin.id);
      await this.equip(skin.id);
      this.render(skin.heroId);
    } catch (error) {
      this.el['skin-status'].textContent = errorCopy(this.copy, error?.code);
    } finally {
      this.busy = false;
      this.syncAction();
    }
  }

  async equip(skinId) {
    if (skinId) this.profile.equippedSkins[this.heroId] = skinId;
    else delete this.profile.equippedSkins[this.heroId];
    await this.platform.saveProfile(this.profile);
    this.render(this.heroId);
    this.onSelectionChange?.(this.heroId, skinId);
    if (this.openSkin) this.syncAction();
  }
}
