import assert from 'node:assert/strict';
import { access, stat } from 'node:fs/promises';
import test from 'node:test';

import { SkinCommerce } from '../src/commerce/SkinCommerce.js';
import {
  hasSkinAccess, normalizeSkinProfile, PREMIUM_SKINS, selectedSkin, SKIN_ACCESS_MODE,
  SKIN_BY_HERO, SKIN_CATALOG_VERSION,
} from '../src/data/skins.js';
import { weaponSoundProfile } from '../src/game/WeaponAudio.js';
import { weaponEffectProfile } from '../src/game/WeaponPresentation.js';
import { decodeReceiptClaims, settleSkinPurchase } from '../api/purchase-skin.js';

function profile() {
  return normalizeSkinProfile({ ownedSkins: [], equippedSkins: {}, pendingSkinPurchase: null });
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fakeReceipt({ serviceId, amount, txId = 'tx-1' }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ sid: serviceId, amt: amount, tx_id: txId })}.signature`;
}

test('ships one complete premium hero, weapon, projectile, and voice pack per hunter', async () => {
  assert.deepEqual(Object.keys(SKIN_BY_HERO).sort(), ['diamond', 'hina', 'scarlett', 'shana']);
  const prices = new Set();
  for (const skin of Object.values(PREMIUM_SKINS)) {
    assert.equal(SKIN_BY_HERO[skin.heroId], skin);
    assert.ok(skin.primary && skin.secondary && skin.impact && skin.spriteTint);
    assert.ok(skin.motif && skin.weaponPitch && skin.voicePitch);
    assert.ok(!prices.has(skin.priceCredits), 'each stateless receipt SKU needs a unique price');
    prices.add(skin.priceCredits);
    for (const asset of [skin.packArt, skin.voice]) {
      const path = asset.split('?')[0].replace(/^\.\//, '../');
      const url = new URL(path, import.meta.url);
      await access(url);
      assert.ok((await stat(url)).size > 1024);
    }
  }
});

test('owned and equipped skin state is sanitized and remains hero-bound', () => {
  const normalized = normalizeSkinProfile({
    ownedSkins: ['shana-astral-warden', 'fake', 'shana-astral-warden'],
    equippedSkins: { shana: 'shana-astral-warden', hina: 'shana-astral-warden', diamond: 'fake' },
  });
  assert.deepEqual(normalized.ownedSkins, ['shana-astral-warden']);
  assert.deepEqual(normalized.equippedSkins, { shana: 'shana-astral-warden' });
  assert.equal(selectedSkin(normalized, 'shana').id, 'shana-astral-warden');
  assert.equal(selectedSkin(normalized, 'hina'), null);
});

test('free preview exposes every skin without granting durable paid ownership', async () => {
  assert.equal(SKIN_ACCESS_MODE, 'free-preview');
  const state = profile();
  const skin = PREMIUM_SKINS['shana-astral-warden'];
  assert.equal(hasSkinAccess(state, skin.id), true);
  assert.deepEqual(state.ownedSkins, []);
  state.equippedSkins.shana = skin.id;
  assert.equal(selectedSkin(state, 'shana'), skin);

  const main = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  const controller = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/ui/SkinShopController.js', import.meta.url), 'utf8'));
  assert.match(main, /if \(SKIN_ACCESS_MODE === 'paid'\)/);
  assert.match(controller, /if \(hasSkinAccess\(this\.profile, skin\.id\)\)/);
  assert.ok(controller.indexOf('hasSkinAccess(this.profile, skin.id)') < controller.indexOf('this.commerce.purchase(skin.id)'));
});

test('each premium skin remixes all core weapon visuals and audio without changing damage stats', () => {
  for (const skin of Object.values(PREMIUM_SKINS)) {
    for (const weaponId of ['revolver', 'shotgun', 'crossbow', 'flame']) {
      const baseVisual = weaponEffectProfile(weaponId);
      const premiumVisual = weaponEffectProfile(weaponId, skin);
      const baseAudio = weaponSoundProfile(weaponId);
      const premiumAudio = weaponSoundProfile(weaponId, skin);
      assert.notEqual(premiumVisual.color, baseVisual.color);
      assert.ok(premiumVisual.visualScale > baseVisual.visualScale);
      assert.equal(premiumVisual.motif, skin.motif);
      assert.notDeepEqual(premiumAudio, baseAudio);
      assert.ok(premiumAudio.premium);
    }
  }
});

test('wallet purchase starts only on explicit purchase and persists entitlement after settlement', async () => {
  const saved = [];
  const payments = [];
  const calls = [];
  const state = profile();
  const skin = PREMIUM_SKINS['shana-astral-warden'];
  const platform = {
    embedded: true,
    async saveProfile(value) { saved.push(structuredClone(value)); return true; },
    async hasCredits(amount) { return amount === skin.priceCredits; },
    async requestPayment(amount, reason, options) {
      payments.push({ amount, reason, options });
      return { success: true, receiptToken: 'header.payload.signature' };
    },
  };
  const fetcher = async (_url, options = {}) => {
    calls.push(options);
    if (options.method === 'GET') return response({ ready: true, catalogVersion: SKIN_CATALOG_VERSION });
    const body = JSON.parse(options.body);
    assert.equal(body.action, 'settle');
    assert.equal(body.skinId, skin.id);
    return response({ ok: true, skinId: skin.id, transactionId: 'tx-1' });
  };
  const commerce = new SkinCommerce({ platform, profile: state, fetcher, endpoint: 'https://example.test/api' });
  assert.equal(payments.length, 0);
  const result = await commerce.purchase(skin.id);
  assert.equal(result.ok, true);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].amount, skin.priceCredits);
  assert.match(payments[0].options.idempotencyKey, new RegExp(skin.id));
  assert.deepEqual(state.ownedSkins, [skin.id]);
  assert.equal(state.equippedSkins.shana, skin.id);
  assert.equal(state.pendingSkinPurchase, null);
  assert.ok(saved.some((entry) => entry.pendingSkinPurchase?.receiptToken));
});

test('server verifies the signed receipt boundary and settles the exact skin SKU', async () => {
  const previous = process.env.USION_SERVICE_ID;
  process.env.USION_SERVICE_ID = 'dawn-service';
  const skin = PREMIUM_SKINS['diamond-bloodmoon-regent'];
  const receiptToken = fakeReceipt({ serviceId: 'dawn-service', amount: skin.priceCredits });
  assert.equal(decodeReceiptClaims(receiptToken).amt, skin.priceCredits);
  const calls = [];
  const fetcher = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    if (url.endsWith('/verify-pending')) return response({ valid: true, tx_id: 'tx-1' });
    return response({ outcome: 'settled', tx_id: 'tx-1', status: 'completed' });
  };
  try {
    const result = await settleSkinPurchase({ skinId: skin.id, receiptToken }, fetcher);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true, skinId: skin.id, transactionId: 'tx-1' });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.expected_amount, skin.priceCredits);
    assert.equal(calls[0].body.expected_service_id, 'dawn-service');
  } finally {
    if (previous == null) delete process.env.USION_SERVICE_ID;
    else process.env.USION_SERVICE_ID = previous;
  }
});

test('skin shop has no preselected action and shows the full generated pack', async () => {
  const html = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../index.html', import.meta.url), 'utf8'));
  const controller = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/ui/SkinShopController.js', import.meta.url), 'utf8'));
  assert.match(html, /id="skin-list"/);
  assert.match(html, /id="skin-preview"/);
  assert.match(html, /id="skin-action"/);
  assert.match(controller, /premium\.addEventListener\('click', \(\) => this\.open\(skin\)\)/);
  assert.doesNotMatch(controller, /requestPayment[^]*constructor/);
});
