import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WeaponPurchaseModal } from '../src/ui/WeaponPurchaseModal.js';
import { applySkinEntitlements, hasWeaponSkinAccess } from '../src/data/weaponSkins.js?build=20260903d';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { WEAPONS } from '../src/data/weapons.js';

const ids = Object.keys(WEAPONS);
const skin = Object.values(PREMIUM_SKINS)[0];
const grant = (id, selected = skin) => `weapon:${id}:${selected.id}`;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('login-required and pending credentials are not mislabeled as a store outage', (t) => {
  for (const lang of ['en', 'mn']) {
    const { modal } = setup(t, { lang });
    assert.equal(modal.errorText({ code: 'LOGIN_REQUIRED' }), modal.copy.login);
    assert.equal(modal.errorText({ code: 'authentication-pending' }), modal.copy.connecting);
    assert.notEqual(modal.copy.login, modal.copy.unavailable);
  }
});

function fakeDocument() {
  const doc = { activeElement: null, listeners: new Map() };
  function element(tag = 'div') {
    const listeners = new Map(), classes = new Set();
    return {
      tagName: tag.toUpperCase(), children: [], attributes: {}, hidden: false, disabled: false, inert: false,
      classList: { toggle(name, value) { value ? classes.add(name) : classes.delete(name); }, contains: (name) => classes.has(name) },
      append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) || []), callback]); },
      fire(type, values = {}) {
        const event = { target: this, prevented: false, stopped: false,
          preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
        if (!this.disabled) for (const callback of listeners.get(type) || []) callback(event);
        return event;
      },
      focus() { doc.activeElement = this; },
      closest(selector) { if (selector === '[hidden]' && this.hidden) return this; return this.parentElement?.closest(selector) || null; },
      querySelectorAll(selector) { return this.children.flatMap((child) => [...(selector === 'button' && child.tagName === 'BUTTON' ? [child] : []), ...child.querySelectorAll(selector)]); },
    };
  }
  doc.createElement = element;
  doc.body = element('body');
  doc.app = element();
  doc.menu = element();
  doc.app.append(doc.menu);
  doc.body.append(doc.app);
  doc.getElementById = (id) => id === 'app' ? doc.app : null;
  doc.addEventListener = (type, callback) => doc.listeners.set(type, callback);
  return doc;
}

function setup(t, { owned = [], ready = true, lang = 'en', commerce: overrides = {} } = {}) {
  const original = { document: globalThis.document, Audio: globalThis.Audio };
  const document = globalThis.document = fakeDocument();
  const sounds = [];
  globalThis.Audio = class {
    constructor(src) { this.src = src; sounds.push(this); }
    async play() { this.played = true; }
    pause() { this.paused = true; }
  };
  t.after(() => Object.assign(globalThis, original));
  const profile = {};
  const access = new Set(owned.map((id) => grant(id)));
  const sync = () => applySkinEntitlements(profile, [...access]);
  sync();
  let changes = 0;
  const calls = [];
  const commerce = {
    ready, pendingOrder: null,
    async refresh() { calls.push(['refresh']); },
    async purchase(skinId, weaponId, options) {
      calls.push(['purchase', skinId, weaponId, options]);
      for (const id of options.bundle ? ids : [weaponId]) access.add(`weapon:${id}:${skinId}`);
      sync();
    },
    async resumePending() { calls.push(['resume']); this.pendingOrder = null; },
    async cancelPending() { calls.push(['cancel']); this.pendingOrder = null; },
    ...overrides,
  };
  const modal = new WeaponPurchaseModal({ profile, commerce, weapons: WEAPONS, i18n: { lang }, onChange: () => changes++ });
  return { modal, document, profile, commerce, calls, sounds, access, sync, changes: () => changes };
}

test('four accurate weapon previews; opening, selecting and auditioning never purchases', async (t) => {
  const { modal, calls, sounds } = setup(t);
  await modal.open('shotgun', skin);
  assert.equal(modal.cards.size, 4);
  for (const [id, card] of modal.cards) {
    assert.equal(card.image.src, skin.weaponArt[id]);
    assert.equal(card.button.attributes['aria-pressed'], String(id === 'shotgun'));
    assert.equal(card.button.children[1].textContent, WEAPONS[id].name);
  }
  assert.match(modal.single.textContent, /Grave Shotgun · 500₮/);
  assert.match(modal.bundle.textContent, /1,000₮/);
  assert.equal(modal.savings.textContent, 'Save 1,000₮');
  modal.cards.get('crossbow').button.fire('click');
  await modal.playAudio();
  assert.match(sounds[0].src, /crossbow\.wav\?build=/);
  assert.equal(sounds[0].played, true);
  assert.equal(calls.some(([type]) => type === 'purchase'), false);
  modal.close();
  assert.equal(sounds[0].paused, true);
});

for (const lang of ['mn', 'en']) {
  test(`purchase modal has no platform, wallet, preview or account explanations in ${lang}`, async (t) => {
    const { modal } = setup(t, { lang });
    await modal.open('revolver', skin);
    const descendants = (el) => el.children.flatMap((child) => [child, ...descendants(child)]);
    const policies = descendants(modal.root).filter((el) => ['weapon-shop__policy', 'weapon-shop__preview-note'].includes(el.className));
    assert.equal(policies.length, 0);
    const text = descendants(modal.root).map((el) => el.textContent || '').join('\n');
    assert.doesNotMatch(text, /Cosmetic only|across devices|Зөвхөн харагдац|бусад төхөөрөмж|Usion|free to preview|Recharge|үнэгүй|Цэнэглэх/);
    assert.equal(modal.status.hidden, true);
    assert.equal(modal.refreshButton.hidden, true);
    assert.match(modal.single.textContent, /500₮/);
    assert.match(modal.bundle.textContent, /1,000₮/);
  });
}

for (const ownedCount of [0, 1, 2, 3, 4]) {
  test(`owned badges and fixed-price bundle policy with ${ownedCount}/4 owned`, async (t) => {
    const { modal, calls } = setup(t, { owned: ids.slice(0, ownedCount) });
    await modal.open('revolver', skin);
    assert.equal(modal.single.disabled, ownedCount > 0);
    assert.equal(modal.bundle.hidden, ownedCount >= 3);
    assert.equal(modal.bundle.disabled, ownedCount >= 3);
    assert.equal(modal.savings.hidden, ownedCount >= 2);
    for (const [id, card] of modal.cards) assert.equal(card.badge.classList.contains('is-owned'), ids.indexOf(id) < ownedCount);
    if (ownedCount === 1) assert.equal(modal.savings.textContent, 'Save 500₮');
    if (ownedCount === 2) assert.equal(modal.savings.textContent, '');
    if (ownedCount >= 3) { await modal.buy(true); assert.equal(calls.filter(([type]) => type === 'purchase').length, 0); }
  });
}

test('single purchase is explicit, server-confirmed and serialized even across close/reopen', async (t) => {
  const pending = deferred();
  const env = setup(t);
  env.commerce.purchase = async (...args) => { env.calls.push(['purchase', ...args]); await pending.promise; env.access.add(grant('shotgun')); env.sync(); };
  await env.modal.open('shotgun', skin);
  const action = env.modal.buy(false);
  assert.equal(env.modal.single.disabled, true);
  assert.equal(env.modal.bundle.disabled, true);
  assert.equal(env.modal.resume.disabled, true);
  assert.equal(hasWeaponSkinAccess(env.profile, 'shotgun', skin.id), false);
  await env.modal.buy(false);
  env.modal.close();
  await env.modal.open('crossbow', skin);
  assert.equal(env.modal.single.disabled, true);
  pending.resolve();
  await action;
  assert.equal(env.calls.filter(([type]) => type === 'purchase').length, 1);
  assert.deepEqual(env.calls.find(([type]) => type === 'purchase'), ['purchase', skin.id, 'shotgun', { bundle: false }]);
  assert.equal(hasWeaponSkinAccess(env.profile, 'shotgun', skin.id), true);
  assert.equal(env.modal.weaponId, 'crossbow');
  assert.equal(env.modal.status.textContent, ''); // Do not claim the newly previewed gun was purchased.
  assert.equal(env.modal.single.disabled, false);
});

test('bundle confirms all four and never changes heroes or equips optimistically', async (t) => {
  const { modal, calls, profile } = setup(t);
  profile.selectedHero = 'diamond';
  await modal.open('flame', skin);
  await modal.buy(true);
  assert.deepEqual(calls.at(-1), ['purchase', skin.id, 'flame', { bundle: true }]);
  for (const id of ids) assert.equal(hasWeaponSkinAccess(profile, id, skin.id), true);
  assert.equal(profile.selectedHero, 'diamond');
  assert.equal(profile.equippedWeaponSkins, undefined);
  assert.equal(modal.status.textContent, 'Purchased.');
  assert.equal(modal.single.disabled, true);
  assert.equal(modal.bundle.hidden, true);
});

test('unconfirmed result never shows success or grants ownership', async (t) => {
  const { modal, profile, changes } = setup(t, { commerce: { async purchase() {} } });
  await modal.open('revolver', skin);
  const before = changes();
  await modal.buy(false);
  assert.equal(modal.status.textContent, 'Payment not yet confirmed.');
  assert.equal(hasWeaponSkinAccess(profile, 'revolver', skin.id), false);
  assert.equal(changes(), before);
});

test('pending purchase shows exact original amount; resume only and safe unpaid cancellation', async (t) => {
  const { modal, commerce, calls } = setup(t);
  commerce.pendingOrder = { id: 'order-1', productId: 'previous-product', status: 'awaiting_payment', amount: 1000 };
  await modal.open('shotgun', skin);
  assert.equal(modal.recovery.hidden, false);
  assert.match(modal.resume.textContent, /Resume purchase · 1,000₮/);
  assert.equal(modal.cancel.hidden, false);
  await modal.buy(false);
  assert.equal(calls.some(([type]) => type === 'purchase'), false);
  await modal.recover();
  assert.deepEqual(calls.at(-1), ['resume']);
  assert.equal(modal.recovery.hidden, true);
  commerce.pendingOrder = { status: 'charged', amount: 500 };
  modal.render();
  assert.equal(modal.cancel.hidden, true);
  assert.match(modal.resume.textContent, /Recover purchase · 500₮/);
  assert.match(modal.pendingCopy.textContent, /without another charge/);
  await modal.cancelOrder();
  assert.equal(calls.some(([type]) => type === 'cancel'), false);
  commerce.pendingOrder.status = 'awaiting_payment';
  await modal.cancelOrder();
  assert.deepEqual(calls.at(-1), ['cancel']);
});

test('failed recovery preserves retry controls without offering a second purchase', async (t) => {
  const { modal, commerce } = setup(t, { commerce: { async resumePending() { throw { code: 'PAYMENT_NOT_FOUND' }; } } });
  commerce.pendingOrder = { status: 'awaiting_payment', amount: 500 };
  await modal.open('revolver', skin);
  await modal.recover();
  assert.equal(modal.status.textContent, 'Payment not yet confirmed.');
  assert.equal(modal.recovery.hidden, false);
  assert.equal(modal.resume.disabled, false);
  assert.equal(modal.single.disabled, true);
});

test('unpaid order can be cancelled even when the current catalog is unavailable', async (t) => {
  const { modal, commerce, calls } = setup(t, { ready: false });
  commerce.pendingOrder = { status: 'awaiting_payment', amount: 500 };
  await modal.open('revolver', skin);
  assert.equal(modal.single.disabled, true);
  assert.equal(modal.resume.disabled, true);
  assert.equal(modal.cancel.disabled, false);
  await modal.cancelOrder();
  assert.deepEqual(calls.at(-1), ['cancel']);
});

test('failed shop read gives a concise error and retry, never misleading platform instructions', async (t) => {
  const { modal, calls } = setup(t, { ready: false, lang: 'mn' });
  await modal.open('revolver', skin);
  assert.match(modal.single.textContent, /Рүн буу · 500₮/);
  assert.equal(modal.status.textContent, 'Дэлгүүртэй холбогдсонгүй.');
  assert.equal(modal.status.hidden, false);
  assert.equal(modal.refreshButton.hidden, false);
  assert.equal(modal.refreshButton.textContent, 'Дахин оролдох');
  assert.equal(modal.single.disabled, true);
  assert.equal(modal.bundle.disabled, true);
  assert.equal(modal.audioButton.disabled, false);
  await modal.buy(false);
  assert.deepEqual(calls, [['refresh']]);
});

test('dialog traps focus, closes on Escape and restores background inert/focus state', async (t) => {
  const { modal, document } = setup(t);
  const trigger = document.createElement('button');
  document.menu.append(trigger);
  trigger.focus();
  await modal.open('revolver', skin);
  assert.equal(modal.root.parentElement, document.app);
  assert.equal(modal.root.attributes.role, 'dialog');
  assert.equal(document.menu.inert, true);
  assert.equal(document.activeElement, modal.closeButton);
  const key = (key, shiftKey = false) => {
    const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {} };
    document.listeners.get('keydown')(event);
    return event;
  };
  assert.equal(key('Tab', true).prevented, true);
  assert.equal(document.activeElement, modal.bundle);
  assert.equal(key('Tab').prevented, true);
  assert.equal(document.activeElement, modal.closeButton);
  key('Escape');
  assert.equal(modal.root.hidden, true);
  assert.equal(document.menu.inert, false);
  assert.equal(document.activeElement, trigger);
});

test('shop styles are scoped, inherit rotation and allow scrolling at 300px landscape height', () => {
  const css = readFileSync(new URL('../weapon-shop.css', import.meta.url), 'utf8');
  assert.match(css, /html\.mobile-rotated \.weapon-shop/);
  assert.match(css, /max-height: 300px/);
  assert.match(css, /max-height: 100%/);
  assert.match(css, /overflow: auto/);
  assert.match(css, /touch-action: pan-y/);
  assert.doesNotMatch(css, /(?:^|\n)(?:button|img|body|#app)\s*\{/);
});
