import { PREMIUM_SKINS, SKIN_CATALOG_VERSION, SKIN_PURCHASE_ENDPOINT } from '../data/skins.js?build=20260901a';

function purchaseError(code, cause = null) {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function purchaseId(skinId) {
  const nonce = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `dawn-${SKIN_CATALOG_VERSION}-${skinId}-${nonce}`;
}

export class SkinCommerce {
  constructor({ platform, profile, endpoint = SKIN_PURCHASE_ENDPOINT, fetcher = globalThis.fetch }) {
    this.platform = platform;
    this.profile = profile;
    this.endpoint = endpoint;
    this.fetcher = fetcher?.bind?.(globalThis) || fetcher;
  }

  async endpointReady() {
    if (!this.platform.embedded || !this.fetcher) return false;
    try {
      const response = await this.fetcher(this.endpoint, { method: 'GET', cache: 'no-store' });
      const body = await response.json();
      return response.ok && body?.ready === true && body?.catalogVersion === SKIN_CATALOG_VERSION;
    } catch {
      return false;
    }
  }

  async purchase(skinId) {
    const skin = PREMIUM_SKINS[skinId];
    if (!skin) throw purchaseError('unknown-skin');
    if (this.profile.ownedSkins.includes(skinId)) return { ok: true, alreadyOwned: true, skin };
    if (!await this.endpointReady()) throw purchaseError('purchase-unavailable');
    if (!await this.platform.hasCredits(skin.priceCredits)) throw purchaseError('insufficient-credits');

    const pending = this.profile.pendingSkinPurchase?.skinId === skinId
      ? this.profile.pendingSkinPurchase
      : { skinId, idempotencyKey: purchaseId(skinId), receiptToken: null };
    this.profile.pendingSkinPurchase = pending;
    if (!await this.platform.saveProfile(this.profile)) throw purchaseError('storage-unavailable');
    if (pending.receiptToken) return this.settlePending();

    let payment;
    try {
      payment = await this.platform.requestPayment(
        skin.priceCredits,
        `Dawn Survivor · ${skin.name}`,
        { idempotencyKey: pending.idempotencyKey },
      );
    } catch (cause) {
      throw purchaseError('payment-cancelled', cause);
    }
    if (!payment?.success || !payment.receiptToken) throw purchaseError('payment-incomplete');
    pending.receiptToken = payment.receiptToken;
    this.profile.pendingSkinPurchase = pending;
    if (!await this.platform.saveProfile(this.profile)) {
      await this.sendReceipt('refund', skin, payment.receiptToken).catch(() => {});
      this.profile.pendingSkinPurchase = null;
      throw purchaseError('storage-unavailable');
    }
    return this.settlePending();
  }

  async recoverPending() {
    if (!this.profile.pendingSkinPurchase?.receiptToken) return null;
    return this.settlePending();
  }

  async settlePending() {
    const pending = this.profile.pendingSkinPurchase;
    const skin = PREMIUM_SKINS[pending?.skinId];
    if (!skin || !pending.receiptToken || !this.fetcher) throw purchaseError('payment-incomplete');
    let response;
    try {
      response = await this.sendReceipt('settle', skin, pending.receiptToken);
    } catch (cause) {
      throw purchaseError('settlement-unavailable', cause);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true || body?.skinId !== skin.id) {
      throw purchaseError(body?.error || 'settlement-failed');
    }
    const previousOwned = [...this.profile.ownedSkins];
    const previousEquipped = this.profile.equippedSkins[skin.heroId] || null;
    this.profile.ownedSkins = [...new Set([...previousOwned, skin.id])];
    this.profile.equippedSkins[skin.heroId] = skin.id;
    this.profile.pendingSkinPurchase = null;
    if (!await this.platform.saveProfile(this.profile)) {
      this.profile.ownedSkins = previousOwned;
      if (previousEquipped) this.profile.equippedSkins[skin.heroId] = previousEquipped;
      else delete this.profile.equippedSkins[skin.heroId];
      this.profile.pendingSkinPurchase = pending;
      throw purchaseError('storage-unavailable');
    }
    return { ok: true, skin, transactionId: body.transactionId || null };
  }

  sendReceipt(action, skin, receiptToken) {
    return this.fetcher(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, skinId: skin.id, receiptToken }),
    });
  }
}
