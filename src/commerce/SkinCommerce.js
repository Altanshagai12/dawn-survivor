import { matchesSkinCatalog, skinPaymentDescription, skinProduct, SKIN_STORE_CATALOG } from '../data/skinProducts.js?build=20260903d';
import { applySkinEntitlements, hasWeaponSkinAccess, setWeaponSkin } from '../data/weaponSkins.js?build=20260903d';
import { waitForCommerceAuth } from './auth.js?build=20260903e';

function failure(code, cause) { return Object.assign(new Error(code, { cause }), { code }); }

export class SkinCommerce {
  constructor({ platform, profile, fetcher = globalThis.fetch?.bind(globalThis), authWait = waitForCommerceAuth }) {
    this.platform = platform;
    this.profile = profile;
    this.fetcher = fetcher;
    this.authWait = authWait;
    this.ready = false;
    this.pendingOrder = null;
    this.operation = null;
    this.refreshing = null;
  }

  async request(path, body, refreshedToken = null) {
    const token = refreshedToken || await this.authWait(this.platform);
    const serviceId = this.platform.config?.serviceId;
    if (!this.platform.embedded || !token || !serviceId) {
      throw failure(this.platform.embedded || this.platform.awaitingHost ? 'authentication-pending' : 'purchase-unavailable');
    }
    // Scoped credentials are only sent to the existing Usions backend, never the old game endpoint.
    const base = 'https://mobile.mongolai.mn';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await this.fetcher(`${base}/commerce/${encodeURIComponent(serviceId)}${path}`, {
        method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const code = typeof data.detail?.code === 'string' ? data.detail.code
          : typeof data.detail === 'string' ? data.detail : 'store-unavailable';
        // Only replay a read, only once, and only with a genuinely new token.
        // A verified guest must sign in, not wait for a refresh indefinitely.
        if (response.status === 401 && code !== 'LOGIN_REQUIRED' && body === undefined && !refreshedToken) {
          clearTimeout(timeout);
          const next = await this.authWait(this.platform, token);
          if (next && next !== token) return this.request(path, body, next);
        }
        throw failure(code);
      }
      return data;
    } catch (error) {
      if (error.code) throw error;
      throw failure('store-unavailable', error);
    } finally { clearTimeout(timeout); }
  }

  applyState(state) {
    applySkinEntitlements(this.profile, state.owned);
    this.pendingOrder = state.pendingOrder || null;
    this.ready = state.ready === true && matchesSkinCatalog(state.catalog);
  }

  refresh() {
    if (this.operation) return this.operation;
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.readState().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async readState() {
    try {
      this.applyState(await this.request('/state'));
      // Completion finds the real wallet transaction server-side, including a lost SDK callback.
      // Merely opening the game/modal NEVER opens payment confirmation or charges a wallet.
      if (this.pendingOrder) {
        try { await this.complete(); } catch (error) {
          if (error.code !== 'PAYMENT_NOT_FOUND') throw error;
        }
      }
      return this;
    } catch (error) {
      this.ready = false;
      throw error;
    }
  }

  exclusive(work) {
    if (this.operation) return this.operation;
    this.operation = (async () => {
      if (this.refreshing) await this.refreshing;
      return work();
    })().finally(() => { this.operation = null; });
    return this.operation;
  }

  purchase(skinId, weaponId, { bundle = false } = {}) {
    return this.exclusive(async () => {
      const product = skinProduct(skinId, weaponId, bundle);
      if (!product) throw failure('unknown-skin');
      await this.readState();
      if (product.grants.every((grant) => {
        const [, id, skin] = grant.split(':');
        return hasWeaponSkinAccess(this.profile, id, skin);
      })) return this.equip(skinId, weaponId);
      if (!this.ready) throw failure('purchase-unavailable');
      if (this.pendingOrder && this.pendingOrder.productId !== product.id) throw failure('purchase-pending');
      if (!this.pendingOrder) this.pendingOrder = await this.request('/orders', { product_id: product.id });
      this.validateOrder(this.pendingOrder, product);
      await this.payPending();
      return this.equip(skinId, weaponId);
    });
  }

  validateOrder(order, expected = null) {
    const product = expected || SKIN_STORE_CATALOG.products.find((item) => item.id === order?.productId);
    if (!product || order?.productId !== product.id || order.amount !== product.amount
      || typeof order.id !== 'string' || typeof order.idempotencyKey !== 'string'
      || !Array.isArray(order.grants) || order.grants.length !== product.grants.length
      || !product.grants.every((grant) => order.grants.includes(grant))) throw failure('purchase-unavailable');
    return product;
  }

  async payPending() {
    const order = this.pendingOrder;
    const product = this.validateOrder(order);
    try { return await this.complete(); } catch (error) {
      if (error.code !== 'PAYMENT_NOT_FOUND') throw error;
    }
    // Do not precheck balance: the host payment modal owns confirmation AND wallet recharge.
    try {
      const result = await this.platform.requestPayment(order.amount, skinPaymentDescription(product, this.platform.config.language), {
        idempotencyKey: order.idempotencyKey,
      });
      if (result?.success !== true && result?.type !== 'PAYMENT_SUCCESS') throw failure('payment-incomplete');
    } catch (error) {
      // Even a rejection/timeout can follow a successful debit; query before showing an error.
      try { return await this.complete(); } catch (recovery) {
        if (recovery.code !== 'PAYMENT_NOT_FOUND') throw recovery;
      }
      const cancelled = /cancel(?:l)?ed|цуцал/i.test(String(error?.code || error?.message || ''));
      throw failure(cancelled ? 'payment-cancelled' : 'payment-incomplete', error);
    }
    return this.complete();
  }

  async complete() {
    if (!this.pendingOrder) return null;
    let result;
    try { result = await this.request(`/orders/${encodeURIComponent(this.pendingOrder.id)}/complete`, {}); }
    catch (error) {
      if (['PAYMENT_REFUNDED', 'ORDER_CLOSED'].includes(error.code)) this.pendingOrder = null;
      throw error;
    }
    if (result.order?.status !== 'completed' || !Array.isArray(result.owned)) throw failure('payment-incomplete');
    applySkinEntitlements(this.profile, result.owned);
    this.pendingOrder = null;
    return result;
  }

  resumePending() {
    return this.exclusive(async () => {
      await this.readState();
      if (!this.pendingOrder) return { ok: true };
      if (!this.ready) throw failure('purchase-unavailable');
      return this.payPending();
    });
  }

  cancelPending() {
    return this.exclusive(async () => {
      if (!this.pendingOrder) return;
      await this.request(`/orders/${encodeURIComponent(this.pendingOrder.id)}/cancel`, {});
      await this.readState();
    });
  }

  async equip(skinId, weaponId) {
    if (!setWeaponSkin(this.profile, weaponId, skinId)) throw failure('payment-incomplete');
    // Ownership is already durable; a preference-save failure must never revoke the purchase.
    const saved = await this.platform.saveProfile(this.profile).catch(() => false);
    return { ok: true, preferenceSaved: saved !== false };
  }
}
