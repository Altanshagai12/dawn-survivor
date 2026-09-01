import { hasSkinAccess, selectedSkin, SKIN_ACCESS_MODE, SKIN_BY_HERO } from '../data/skins.js?build=20260901a';

const COPY = {
  en: {
    title: 'SKIN', default: 'Original', free: 'FREE TO TRY', owned: 'OWNED', equipped: 'EQUIPPED',
    preview: 'PREVIEW PACK', buy: 'BUY', equip: 'EQUIP', equippedButton: 'EQUIPPED', close: 'CLOSE',
    buying: 'CONFIRM IN USIONS…', unavailable: 'Purchases are not online yet.',
    insufficient: 'Not enough Usions credits.', cancelled: 'Purchase cancelled.',
    retry: 'Payment is safe. Reopen this skin to finish delivery.',
  },
  mn: {
    title: 'SKIN', default: 'Энгийн', free: 'ҮНЭГҮЙ ТУРШИХ', owned: 'АВСАН', equipped: 'ӨМСӨЖ БУЙ',
    preview: 'БҮТЭН БАГЦ', buy: 'АВАХ', equip: 'ӨМСӨХ', equippedButton: 'ӨМСӨЖ БУЙ', close: 'ХААХ',
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
    this.el = Object.fromEntries([
      'skin-list', 'skin-section-title', 'skin-modal', 'skin-preview', 'skin-name', 'skin-description',
      'skin-price', 'skin-status', 'skin-action', 'skin-close',
    ].map((id) => [id, document.getElementById(id)]));
    this.el['skin-close'].addEventListener('click', () => this.close());
    this.el['skin-action'].addEventListener('click', () => this.activate());
  }

  get copy() { return COPY[this.i18n.lang === 'mn' ? 'mn' : 'en']; }

  selection(heroId = this.heroId) {
    return this.selected(heroId)?.id || null;
  }

  selected(heroId = this.heroId) { return selectedSkin(this.profile, heroId); }

  render(heroId) {
    this.heroId = heroId;
    const skin = SKIN_BY_HERO[heroId];
    const equipped = this.selection(heroId);
    this.el['skin-section-title'].textContent = this.copy.title;
    const original = document.createElement('button');
    original.type = 'button';
    original.className = `skin-card skin-card--original${!equipped ? ' selected' : ''}`;
    original.innerHTML = `<b>✦</b><span>${this.copy.default}</span>${!equipped ? `<small>${this.copy.equipped}</small>` : ''}`;
    original.addEventListener('click', () => this.equip(null));

    const premium = document.createElement('button');
    premium.type = 'button';
    premium.className = `skin-card skin-card--premium${equipped === skin.id ? ' selected' : ''}`;
    const accessLabel = SKIN_ACCESS_MODE === 'free-preview' ? this.copy.free
      : this.profile.ownedSkins.includes(skin.id) ? this.copy.owned : `${skin.priceCredits} ◈`;
    premium.innerHTML = `<img src="${skin.packArt}" alt=""/><span>${this.i18n.lang === 'mn' ? skin.nameMn : skin.name}</span><small>${equipped === skin.id ? this.copy.equipped : accessLabel}</small>`;
    premium.addEventListener('click', () => this.open(skin));
    this.el['skin-list'].replaceChildren(original, premium);
  }

  open(skin) {
    this.openSkin = skin;
    this.el['skin-preview'].src = skin.packArt;
    this.el['skin-name'].textContent = this.i18n.lang === 'mn' ? skin.nameMn : skin.name;
    this.el['skin-description'].textContent = this.i18n.lang === 'mn' ? skin.descriptionMn : skin.description;
    this.el['skin-price'].textContent = SKIN_ACCESS_MODE === 'free-preview' ? this.copy.free : `${skin.priceCredits} ◈`;
    this.el['skin-status'].textContent = '';
    this.el['skin-close'].textContent = this.copy.close;
    this.syncAction();
    this.el['skin-modal'].classList.remove('hidden');
  }

  close() {
    if (this.busy) return;
    this.el['skin-modal'].classList.add('hidden');
    this.openSkin = null;
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
