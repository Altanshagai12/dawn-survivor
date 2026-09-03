import { SkinCommerce } from '../../src/commerce/SkinCommerce.js?build=20260903f';
import { SKIN_STORE_CATALOG } from '../../src/data/skinProducts.js?build=20260903d';
import { normalizeWeaponSkinProfile } from '../../src/data/weaponSkins.js?build=20260903d';

// In-memory protocol simulator. NEVER contacts Usions or charges a real wallet.
export function commerceFixture() {
  const state = { catalog: structuredClone(SKIN_STORE_CATALOG), owned: [], order: null,
    sequence: 0, charges: [], requests: [], failCompletion: false, cancelPayment: false,
    loseCallback: false, failSave: false, unavailable: false, token: 'fixture-only-token' };
  const platform = {
    embedded: true, config: { serviceId: 'fixture-game', language: 'mn' },
    getAuthToken: () => state.token,
    saveProfile: async () => !state.failSave,
    hasCredits: () => { throw new Error('Do not bypass the native recharge prompt'); },
    requestPayment: async (amount, reason, { idempotencyKey }) => {
      if (state.cancelPayment) throw new Error('cancelled');
      if (!state.order || idempotencyKey !== state.order.idempotencyKey || amount !== state.order.amount) throw new Error('mismatch');
      if (state.order.status === 'awaiting_payment') {
        state.charges.push({ amount, reason, idempotencyKey });
        state.order.status = 'charged';
      }
      if (state.loseCallback) throw new Error('SDK response lost');
      return { type: 'PAYMENT_SUCCESS', transactionId: `fixture-${state.sequence}` };
    },
  };
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const error = (code) => response({ detail: { code, message: code } }, 409);
  const fetcher = async (url, options) => {
    state.requests.push({ url, options });
    if (state.unavailable) throw new Error('offline');
    if (url.endsWith('/state')) return response({ ready: Boolean(state.catalog), catalog: state.catalog,
      owned: state.owned, pendingOrder: state.order?.status === 'completed' ? null : state.order });
    if (url.endsWith('/orders')) {
      const { product_id: id } = JSON.parse(options.body);
      if (state.order && state.order.status !== 'completed') return error('ORDER_PENDING');
      const product = state.catalog.products.find((p) => p.id === id);
      if (!product) return error('PRODUCT_NOT_FOUND');
      state.sequence += 1;
      state.order = { id: `order-${state.sequence}`, productId: id, name: product.name,
        idempotencyKey: `commerce:v1:order-${state.sequence}`, amount: product.amount,
        grants: product.grants, newGrants: product.grants.filter((v) => !state.owned.includes(v)), status: 'awaiting_payment' };
      return response(state.order);
    }
    if (url.endsWith('/complete')) {
      if (state.failCompletion) throw new Error('network lost');
      if (!state.order || state.order.status === 'awaiting_payment') return error('PAYMENT_NOT_FOUND');
      if (state.order.status === 'refunded') { state.order = null; return error('PAYMENT_REFUNDED'); }
      state.owned = [...new Set([...state.owned, ...state.order.grants])];
      state.order.status = 'completed';
      return response({ order: state.order, owned: state.owned });
    }
    if (url.endsWith('/cancel')) {
      if (state.order?.status !== 'awaiting_payment') return error('ORDER_ALREADY_PAID');
      state.order = null;
      return response({ ok: true });
    }
    throw new Error(`Unknown fixture endpoint ${url}`);
  };
  const profile = normalizeWeaponSkinProfile({});
  const commerce = new SkinCommerce({ platform, profile, fetcher, authWait: async (p) => p.getAuthToken() });
  return { state, platform, profile, fetcher, commerce };
}
