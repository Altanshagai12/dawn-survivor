import { PREMIUM_SKINS, SKIN_CATALOG_VERSION } from '../src/data/skins.js';

const DEFAULT_USION_API = 'https://mobile.mongolai.mn';
const DEFAULT_ORIGINS = ['https://altanshagai12.github.io', 'https://dawn-survivor.vercel.app'];

// Preserve the old pack receipt/refund contract independently of the new 500/1000
// weapon store. New purchases exclusively use platform orders, never this API.
const LEGACY_PACK_PRICES = Object.freeze({
  'shana-astral-warden': 240, 'diamond-bloodmoon-regent': 250,
  'scarlett-sunforge-phoenix': 260, 'hina-void-lotus': 270,
  'shana-celestial-dragon-sovereign': 520, 'diamond-obsidian-eclipse-valkyrie': 540,
  'scarlett-prismatic-tempest-seraph': 560, 'hina-nine-tail-chrono-kitsune': 580,
});

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function allowedOrigins() {
  return new Set((process.env.DAWN_ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',').map((value) => value.trim()).filter(Boolean));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return !origin || allowedOrigins().has(origin);
}

export function decodeReceiptClaims(receiptToken) {
  if (typeof receiptToken !== 'string' || receiptToken.length < 10 || receiptToken.length > 4096) return null;
  const segments = receiptToken.split('.');
  if (segments.length !== 3) return null;
  try {
    const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function callReceiptApi(path, body, fetcher = fetch) {
  const base = (process.env.USION_API_BASE || DEFAULT_USION_API).replace(/\/$/, '');
  const response = await fetcher(`${base}/wallet/receipt/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

export async function settleSkinPurchase({ skinId, receiptToken }, fetcher = fetch) {
  const skin = PREMIUM_SKINS[skinId];
  const serviceId = process.env.USION_SERVICE_ID;
  const claims = decodeReceiptClaims(receiptToken);
  if (!skin || !serviceId || !claims) return { status: 400, body: { ok: false, error: 'invalid-purchase' } };
  if (claims.sid !== serviceId || Number(claims.amt) !== LEGACY_PACK_PRICES[skinId]) {
    return { status: 400, body: { ok: false, error: 'receipt-mismatch' } };
  }

  const verified = await callReceiptApi('verify-pending', {
    receipt_token: receiptToken,
    expected_service_id: serviceId,
    expected_amount: LEGACY_PACK_PRICES[skinId],
  }, fetcher);
  if (!verified.ok && verified.status !== 409) {
    return { status: 402, body: { ok: false, error: 'receipt-invalid' } };
  }

  const settled = await callReceiptApi('settle', { receipt_token: receiptToken }, fetcher);
  const accepted = settled.ok && ['settled', 'already_settled'].includes(settled.payload?.outcome);
  if (!accepted) return { status: 409, body: { ok: false, error: 'settlement-failed' } };
  return {
    status: 200,
    body: {
      ok: true,
      skinId: skin.id,
      transactionId: settled.payload.tx_id || verified.payload.tx_id || claims.tx_id || null,
    },
  };
}

export async function refundSkinPurchase({ skinId, receiptToken }, fetcher = fetch) {
  const skin = PREMIUM_SKINS[skinId];
  const serviceId = process.env.USION_SERVICE_ID;
  const claims = decodeReceiptClaims(receiptToken);
  if (!skin || !serviceId || !claims) return { status: 400, body: { ok: false, error: 'invalid-purchase' } };
  if (claims.sid !== serviceId || Number(claims.amt) !== LEGACY_PACK_PRICES[skinId]) {
    return { status: 400, body: { ok: false, error: 'receipt-mismatch' } };
  }
  const refunded = await callReceiptApi('refund', { receipt_token: receiptToken }, fetcher);
  const accepted = refunded.ok && ['refunded', 'already_refunded'].includes(refunded.payload?.outcome);
  return accepted
    ? { status: 200, body: { ok: true, skinId: skin.id, refunded: true } }
    : { status: 409, body: { ok: false, error: 'refund-failed' } };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return json(res, 403, { ok: false, error: 'origin-not-allowed' });
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      ready: Boolean(process.env.USION_SERVICE_ID),
      catalogVersion: SKIN_CATALOG_VERSION,
    });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method-not-allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const operation = body.action === 'refund' ? refundSkinPurchase : settleSkinPurchase;
    const result = await operation({ skinId: body.skinId, receiptToken: body.receiptToken });
    return json(res, result.status, result.body);
  } catch (error) {
    console.error('skin purchase settlement failed', error);
    return json(res, 503, { ok: false, error: 'settlement-unavailable' });
  }
}
