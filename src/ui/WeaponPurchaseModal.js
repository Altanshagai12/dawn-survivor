import { hasWeaponSkinAccess } from '../data/weaponSkins.js?build=20260903d';
import { SKIN_PRICE_MNT, SKIN_BUNDLE_PRICE_MNT } from '../data/skinProducts.js?build=20260903d';

const COPY = {
  en: {
    title: 'Weapon skins', close: 'Close', owned: 'Owned', selected: 'Selected',
    preview: 'Images & weapon sounds are free to preview.', audio: '♪ Preview selected weapon sound',
    wallet: 'Pay with your Usion wallet. Low balance? Choose Recharge in the payment window.',
    buy: 'Buy', bundle: 'Complete 4-weapon set', remaining: 'remaining', separately: 'separately',
    save: 'Save', equal: 'Same price as buying the remaining weapons separately.',
    loading: 'Checking ownership…', working: 'Confirming purchase…', refresh: 'Refresh ownership',
    unavailable: 'Open this game inside Usion to buy. If already in Usion, the shop is temporarily unavailable. Previews remain free.',
    login: 'Sign in to Usion, then reopen the game to buy. Previews remain free.',
    connecting: 'Waiting for Usion sign-in details. Refresh ownership to try again. Previews remain free.',
    success: 'Purchase confirmed. Your weapon skin is now available.',
    pending: 'A previous purchase needs attention. Resume it before starting another purchase.',
    resume: 'Resume purchase', recover: 'Recover purchase', cancel: 'Cancel unpaid order',
    charged: 'Payment received. Recover to finish unlocking; no second payment.',
    cancelled: 'Purchase cancelled. No skin was unlocked.', incomplete: 'Purchase is not confirmed yet. Resume or refresh to check its status.',
    failed: 'Could not confirm the purchase. Your ownership has not changed. Refresh or resume the pending order.',
    refunded: 'This payment was refunded. Refresh ownership before trying again.',
    soundFailed: 'Sound preview could not play. Tap to try again.',
  },
  mn: {
    title: 'Бууны skin', close: 'Хаах', owned: 'Эзэмшсэн', selected: 'Сонгосон',
    preview: 'Зураг, бууны дууг үнэгүй үзэж, сонсоно.', audio: '♪ Сонгосон бууны дуу сонсох',
    wallet: 'Usion хэтэвчээр төлнө. Үлдэгдэл хүрэхгүй бол төлбөрийн цонхны «Цэнэглэх»-ийг сонгоно.',
    buy: 'Авах', bundle: '4 бууны багцыг бүрдүүлэх', remaining: 'буу үлдсэн', separately: 'тус тусад нь',
    save: 'Хэмнэлт', equal: 'Үлдсэн буунуудыг тусад нь авахтай ижил үнэ.',
    loading: 'Эзэмшлийг шалгаж байна…', working: 'Худалдан авалтыг баталгаажуулж байна…', refresh: 'Эзэмшлийг шинэчлэх',
    unavailable: 'Худалдан авахын тулд Usion дотроос нээнэ үү. Usion дотор байгаа бол дэлгүүр түр боломжгүй байна. Зураг, дууг үнэгүй үзэж болно.',
    login: 'Худалдан авахын тулд Usion-д нэвтрээд тоглоомоо дахин нээнэ үү. Зураг, дууг үнэгүй үзэж болно.',
    connecting: 'Usion-оос нэвтрэлтийн мэдээлэл хүлээж байна. Эзэмшлийг шинэчлэх дээр дарж дахин шалгана уу.',
    success: 'Худалдан авалт баталгаажлаа. Бууны skin ашиглах боломжтой боллоо.',
    pending: 'Өмнөх худалдан авалт дуусаагүй байна. Шинэ худалдан авалтаас өмнө үргэлжлүүлнэ үү.',
    resume: 'Худалдан авалтыг үргэлжлүүлэх', recover: 'Худалдан авалтыг сэргээх', cancel: 'Төлөөгүй захиалгыг цуцлах',
    charged: 'Төлбөр төлөгдсөн. Дахин төлөхгүйгээр сэргээж skin-ээ нээнэ үү.',
    cancelled: 'Худалдан авалт цуцлагдлаа. Skin нээгдээгүй.', incomplete: 'Худалдан авалт хараахан баталгаажаагүй. Үргэлжлүүлэх эсвэл шинэчилж шалгана уу.',
    failed: 'Худалдан авалтыг баталгаажуулж чадсангүй. Эзэмшил өөрчлөгдөөгүй. Шинэчлэх эсвэл хүлээгдэж буй захиалгыг үргэлжлүүлнэ үү.',
    refunded: 'Энэ төлбөр буцаагдсан. Дахин оролдохын өмнө эзэмшлийг шинэчилнэ үү.',
    soundFailed: 'Дууг тоглуулж чадсангүй. Дахин дарж оролдоно уу.',
  },
};

function node(tag, className, text = '') {
  const el = document.createElement(tag);
  el.className = `weapon-shop__${className}`;
  el.textContent = text;
  return el;
}

export class WeaponPurchaseModal {
  constructor({ profile, commerce, weapons, i18n, onChange = () => {} }) {
    Object.assign(this, { profile, commerce, weapons, i18n, onChange, busy: false, opened: false, revision: 0 });
    this.copy = COPY[i18n.lang === 'mn' ? 'mn' : 'en'];
    this.cards = new Map();
    this.root = node('div', 'overlay');
    this.root.className = 'weapon-shop';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'weapon-shop-title');
    this.panel = node('section', 'panel');
    const header = node('header', 'header');
    const heading = node('div', 'heading');
    this.title = node('h2', 'title');
    this.title.id = 'weapon-shop-title';
    heading.append(node('p', 'eyebrow', this.copy.title), this.title);
    this.closeButton = this.button('close', '×', () => this.close());
    this.closeButton.setAttribute('aria-label', this.copy.close);
    header.append(heading, this.closeButton);
    const body = node('div', 'body');
    const gallery = node('div', 'gallery');
    const grid = node('div', 'grid');
    for (const weapon of Object.values(weapons)) {
      const button = this.button('weapon', '', () => this.select(weapon.id));
      const image = node('img', 'art');
      image.alt = '';
      image.draggable = false;
      const name = node('strong', 'weapon-name', this.name(weapon));
      const badge = node('span', 'badge');
      button.append(image, name, badge);
      this.cards.set(weapon.id, { button, image, badge });
      grid.append(button);
    }
    gallery.append(grid, node('p', 'preview-note', this.copy.preview));
    const details = node('div', 'details');
    this.audioButton = this.button('audio', this.copy.audio, () => this.playAudio());
    this.single = this.button('buy', '', () => this.buy(false));
    this.bundle = this.button('bundle', '', () => this.buy(true));
    this.savings = node('p', 'savings');
    this.status = node('p', 'status');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.recovery = node('div', 'recovery');
    this.pendingCopy = node('p', 'pending-copy');
    this.resume = this.button('resume', '', () => this.recover());
    this.cancel = this.button('cancel', this.copy.cancel, () => this.cancelOrder());
    this.recovery.append(this.pendingCopy, this.resume, this.cancel);
    this.refreshButton = this.button('refresh', this.copy.refresh, () => this.refresh());
    details.append(this.audioButton, this.single, this.bundle, this.savings, this.status, this.recovery,
      this.refreshButton, node('p', 'policy', this.copy.wallet));
    body.append(gallery, details);
    this.panel.append(header, body);
    this.root.append(this.panel);
    (document.getElementById('app') || document.body).append(this.root);
    this.root.addEventListener('click', (event) => { event.stopPropagation(); if (event.target === this.root) this.close(); });
    document.addEventListener('keydown', (event) => this.keydown(event), true);
  }

  name(item) { return this.i18n.lang === 'mn' ? item.nameMn || item.name : item.name; }
  money(amount) { return `${Number(amount).toLocaleString('en-US')}₮`; }
  button(className, text, action) {
    const button = node('button', className, text);
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
  }

  async open(weaponId, skin) {
    if (!skin?.id || !this.weapons[weaponId]) return;
    if (!this.opened) {
      this.returnFocus = document.activeElement;
      this.siblings = [...this.root.parentElement.children].filter((el) => el !== this.root).map((el) => [el, el.inert]);
      for (const [el] of this.siblings) el.inert = true;
    }
    this.skin = skin;
    this.weaponId = weaponId;
    this.revision += 1;
    this.message = '';
    this.opened = true;
    this.root.hidden = false;
    this.render();
    this.closeButton.focus();
    await this.refresh();
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    this.root.hidden = true;
    this.stopAudio();
    for (const [el, inert] of this.siblings || []) el.inert = inert;
    this.returnFocus?.focus?.();
  }

  select(weaponId) {
    if (this.busy || !this.weapons[weaponId]) return;
    this.stopAudio();
    this.weaponId = weaponId;
    this.message = '';
    this.render();
  }

  render() {
    if (!this.skin) return;
    const owned = [...this.cards.keys()].filter((id) => hasWeaponSkinAccess(this.profile, id, this.skin.id));
    const remaining = this.cards.size - owned.length;
    const pending = this.commerce.pendingOrder;
    const disabled = this.busy || !this.commerce.ready || Boolean(pending);
    this.title.textContent = this.name(this.skin);
    this.root.setAttribute('aria-busy', String(this.busy));
    for (const [id, card] of this.cards) {
      const selected = id === this.weaponId;
      card.image.src = this.skin.weaponArt[id];
      card.button.setAttribute('aria-pressed', String(selected));
      card.button.disabled = this.busy;
      card.badge.textContent = owned.includes(id) ? this.copy.owned : selected ? this.copy.selected : '';
      card.badge.classList.toggle('is-owned', owned.includes(id));
    }
    this.single.textContent = owned.includes(this.weaponId) ? `${this.name(this.weapons[this.weaponId])} · ${this.copy.owned}`
      : `${this.copy.buy} ${this.name(this.weapons[this.weaponId])} · ${this.money(SKIN_PRICE_MNT)}`;
    this.single.disabled = disabled || owned.includes(this.weaponId);
    this.bundle.hidden = remaining < 2;
    this.bundle.disabled = disabled || remaining < 2;
    this.bundle.textContent = `${this.copy.bundle} · ${this.money(SKIN_BUNDLE_PRICE_MNT)}`;
    this.savings.hidden = remaining < 2;
    const separate = remaining * SKIN_PRICE_MNT;
    this.savings.textContent = `${remaining} ${this.copy.remaining} · ${this.money(separate)} ${this.copy.separately}. `
      + (separate > SKIN_BUNDLE_PRICE_MNT ? `${this.copy.save} ${this.money(separate - SKIN_BUNDLE_PRICE_MNT)}.` : this.copy.equal);
    this.status.textContent = this.message || (!this.commerce.ready ? this.copy.unavailable : '');
    this.recovery.hidden = !pending;
    this.pendingCopy.textContent = pending?.status === 'charged' ? this.copy.charged : this.copy.pending;
    const paid = ['charged', 'completed'].includes(pending?.status);
    this.resume.textContent = `${paid ? this.copy.recover : this.copy.resume} · ${this.money(pending?.amount || 0)}`;
    this.resume.disabled = this.busy || !this.commerce.ready;
    this.cancel.hidden = pending?.status !== 'awaiting_payment';
    this.cancel.disabled = this.busy;
    this.refreshButton.disabled = this.busy;
    this.audioButton.disabled = this.busy || !this.skin.audioBank;
  }

  async run(action, success = '') {
    if (this.busy) return;
    const revision = this.revision;
    this.busy = true;
    this.message = success ? this.copy.working : this.copy.loading;
    this.render();
    try {
      await action();
      if (revision === this.revision) this.message = success;
      this.onChange();
    } catch (error) { if (revision === this.revision) this.message = this.errorText(error); }
    finally { this.busy = false; this.render(); }
  }

  refresh() { return this.run(() => this.commerce.refresh()); }
  buy(bundle) {
    if (this.busy || !this.commerce.ready || this.commerce.pendingOrder) return;
    const { id: skinId } = this.skin;
    const weaponId = this.weaponId;
    const remaining = [...this.cards.keys()].filter((id) => !hasWeaponSkinAccess(this.profile, id, skinId));
    if ((bundle && remaining.length < 2) || (!bundle && !remaining.includes(weaponId))) return;
    this.stopAudio();
    return this.run(async () => {
      await this.commerce.purchase(skinId, weaponId, { bundle });
      const required = bundle ? [...this.cards.keys()] : [weaponId];
      if (!required.every((id) => hasWeaponSkinAccess(this.profile, id, skinId))) throw new Error('payment-incomplete');
    }, this.copy.success);
  }
  recover() {
    if (!this.commerce.pendingOrder || !this.commerce.ready) return;
    return this.run(async () => {
      await this.commerce.resumePending();
      if (this.commerce.pendingOrder) throw new Error('payment-incomplete');
    }, this.copy.success);
  }
  cancelOrder() {
    if (this.commerce.pendingOrder?.status !== 'awaiting_payment') return;
    return this.run(() => this.commerce.cancelPending(), this.copy.cancelled);
  }
  errorText(error) {
    const code = String(error?.code || error?.message || '').toLowerCase().replaceAll('_', '-');
    if (code === 'login-required') return this.copy.login;
    if (code === 'authentication-pending') return this.copy.connecting;
    if (code.includes('unavailable')) return this.copy.unavailable;
    if (code.includes('refunded')) return this.copy.refunded;
    if (code.includes('cancelled') || code === 'cancelled') return this.copy.cancelled;
    if (code.includes('pending') || code.includes('incomplete') || code === 'payment-not-found') return this.copy.incomplete;
    if (code === 'already-owned') return this.copy.incomplete;
    return this.copy.failed;
  }
  stopAudio() { this.audio?.pause(); this.audio = null; }
  async playAudio() {
    if (this.busy || !this.skin.audioBank) return;
    this.stopAudio();
    const audio = this.audio = new Audio(`${this.skin.audioBank}/${this.weaponId}.wav?build=20260901b`);
    audio.volume = .55;
    try { await audio.play(); } catch { if (this.audio === audio) { this.message = this.copy.soundFailed; this.render(); } }
  }
  keydown(event) {
    if (!this.opened) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    if (event.key !== 'Tab') return;
    const buttons = [...this.root.querySelectorAll('button')].filter((el) => !el.disabled && !el.hidden && !el.closest('[hidden]'));
    const index = buttons.indexOf(document.activeElement);
    if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
      event.preventDefault();
      (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
    }
  }
}
