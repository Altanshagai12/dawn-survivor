import assert from 'node:assert/strict';
import test from 'node:test';
import { SkinCommerce } from '../src/commerce/SkinCommerce.js?build=20260903d';
import { skinProduct } from '../src/data/skinProducts.js?build=20260903d';
import { hasWeaponSkinAccess, selectedWeaponSkin, normalizeWeaponSkinProfile } from '../src/data/weaponSkins.js?build=20260903d';
import { commerceFixture } from './helpers/skin-commerce-fixture.js';

const A = 'shana-astral-warden';
const B = 'diamond-bloodmoon-regent';

test('opening/refreshing never charges; explicit single purchase uses500 and exact server order key', async () => {
  const f = commerceFixture();
  await f.commerce.refresh();
  assert.equal(f.state.charges.length, 0);
  assert.equal(f.commerce.ready, true);
  await f.commerce.purchase(A, 'shotgun');
  assert.equal(f.state.charges.length, 1);
  assert.equal(f.state.charges[0].amount, 500);
  assert.equal(f.state.charges[0].idempotencyKey, 'commerce:v1:order-1');
  assert.match(f.state.charges[0].reason, /Булшны дробовик/);
  assert.equal(selectedWeaponSkin(f.profile, 'shotgun').id, A);
  assert.equal(hasWeaponSkinAccess(f.profile, 'revolver', A), false);
  assert.equal(f.commerce.pendingOrder, null);
  assert.deepEqual(f.profile.ownedSkins, [], 'client-owned lists are not payment authority');
});

test('all4bundle costs1000, unlocks one same-theme set, and cannot be repurchased', async () => {
  const f = commerceFixture();
  await f.commerce.purchase(A, 'revolver', { bundle: true });
  assert.equal(f.state.charges[0].amount, 1000);
  assert.equal(f.state.owned.length, 4);
  await f.commerce.purchase(A, 'flame', { bundle: true });
  assert.equal(f.state.charges.length, 1);
  assert.equal(hasWeaponSkinAccess(f.profile, 'flame', B), false);
});

test('double clicks share one order and one payment', async () => {
  const f = commerceFixture();
  await Promise.all(Array.from({ length: 8 }, () => f.commerce.purchase(A, 'crossbow')));
  assert.equal(f.state.charges.length, 1);
  assert.equal(f.state.sequence, 1);
});

test('cancelled payment keeps one unpaid order; resume reuses its key', async () => {
  const f = commerceFixture();
  f.state.cancelPayment = true;
  await assert.rejects(f.commerce.purchase(A, 'revolver'), { code: 'payment-cancelled' });
  const key = f.commerce.pendingOrder.idempotencyKey;
  assert.equal(f.state.charges.length, 0);
  assert.equal(selectedWeaponSkin(f.profile, 'revolver'), null);
  await assert.rejects(f.commerce.purchase(B, 'shotgun'), { code: 'purchase-pending' });
  f.state.cancelPayment = false;
  await f.commerce.resumePending();
  assert.equal(f.state.charges[0].idempotencyKey, key);
  assert.ok(hasWeaponSkinAccess(f.profile, 'revolver', A));
});

test('cancelling an unpaid order permits a different order with a new key', async () => {
  const f = commerceFixture();
  f.state.cancelPayment = true;
  await assert.rejects(f.commerce.purchase(A, 'revolver'));
  const key = f.commerce.pendingOrder.idempotencyKey;
  await f.commerce.cancelPending();
  assert.equal(f.commerce.pendingOrder, null);
  f.state.cancelPayment = false;
  await f.commerce.purchase(B, 'flame');
  assert.notEqual(f.state.charges[0].idempotencyKey, key);
});

test('lost SDK callback recovers authentic payment without a second debit', async () => {
  const f = commerceFixture();
  f.state.loseCallback = true;
  await f.commerce.purchase(A, 'revolver');
  assert.equal(f.state.charges.length, 1);
  assert.ok(hasWeaponSkinAccess(f.profile, 'revolver', A));
});

test('lost settlement response is restored on a fresh device with no local receipt', async () => {
  const f = commerceFixture();
  const originalPay = f.platform.requestPayment;
  f.platform.requestPayment = async (...args) => {
    const result = await originalPay(...args);
    f.state.failCompletion = true;
    return result;
  };
  await assert.rejects(f.commerce.purchase(A, 'shotgun'), { code: 'store-unavailable' });
  assert.equal(hasWeaponSkinAccess(f.profile, 'shotgun', A), false);
  f.state.failCompletion = false;
  const fresh = normalizeWeaponSkinProfile({});
  const restored = new SkinCommerce({ platform: f.platform, profile: fresh, fetcher: f.fetcher });
  await restored.refresh();
  assert.equal(f.state.charges.length, 1);
  assert.ok(hasWeaponSkinAccess(fresh, 'shotgun', A));
});

test('preference-save failure never loses a server-confirmed purchase', async () => {
  const f = commerceFixture();
  f.state.failSave = true;
  const result = await f.commerce.purchase(A, 'revolver');
  assert.equal(result.preferenceSaved, false);
  assert.ok(hasWeaponSkinAccess(f.profile, 'revolver', A));
  await f.commerce.purchase(A, 'revolver');
  assert.equal(f.state.charges.length, 1);
});

test('mismatched catalog or server order price/grants fail closed before payment', async () => {
  for (const change of ['catalog', 'price', 'grants']) {
    const f = commerceFixture();
    if (change === 'catalog') f.state.catalog.products[0].amount = 501;
    else {
      const fetcher = f.commerce.fetcher;
      f.commerce.fetcher = async (url, options) => {
        const result = await fetcher(url, options);
        if (!url.endsWith('/orders')) return result;
        const order = await result.json();
        if (change === 'price') order.amount = 1;
        else order.grants = skinProduct(B, 'revolver').grants;
        return new Response(JSON.stringify(order));
      };
    }
    await assert.rejects(f.commerce.purchase(A, 'revolver'), { code: 'purchase-unavailable' });
    assert.equal(f.state.charges.length, 0);
  }
});

test('standalone, expired identity and offline shop cannot charge', async () => {
  for (const reason of ['host', 'token', 'network']) {
    const f = commerceFixture();
    if (reason === 'host') f.platform.embedded = false;
    if (reason === 'token') f.state.token = null;
    if (reason === 'network') f.state.unavailable = true;
    await assert.rejects(f.commerce.purchase(A, 'revolver'));
    assert.equal(f.state.charges.length, 0);
    assert.equal(f.commerce.ready, false);
  }
});

test('each request reads the latest scoped token instead of retaining an expired one', async () => {
  const f = commerceFixture();
  await f.commerce.refresh();
  f.state.token = 'renewed-fixture-token';
  await f.commerce.refresh();
  assert.equal(f.state.requests.at(-1).options.headers.Authorization, 'Bearer renewed-fixture-token');
});

test('an unknown wallet timeout is uncertain, not falsely labelled cancelled', async () => {
  const f = commerceFixture();
  f.platform.requestPayment = async () => { throw new Error('Payment confirmation timeout'); };
  await assert.rejects(f.commerce.purchase(A, 'revolver'), { code: 'payment-incomplete' });
  assert.equal(f.state.charges.length, 0);
  assert.equal(f.commerce.pendingOrder.status, 'awaiting_payment');
});

test('refunded pending purchase never unlocks and cannot reuse its terminal key', async () => {
  const f = commerceFixture();
  const pay = f.platform.requestPayment;
  f.platform.requestPayment = async (...args) => { const result = await pay(...args); f.state.failCompletion = true; return result; };
  await assert.rejects(f.commerce.purchase(A, 'revolver'));
  const oldKey = f.state.order.idempotencyKey;
  f.state.failCompletion = false;
  f.state.order.status = 'refunded';
  await assert.rejects(f.commerce.refresh(), { code: 'PAYMENT_REFUNDED' });
  assert.equal(f.commerce.pendingOrder, null);
  assert.equal(hasWeaponSkinAccess(f.profile, 'revolver', A), false);
  f.platform.requestPayment = pay;
  await f.commerce.purchase(A, 'revolver');
  assert.notEqual(f.state.order.idempotencyKey, oldKey);
});
