import assert from 'node:assert/strict';
import { access, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

import { SkinCommerce } from '../src/commerce/SkinCommerce.js';
import {
  hasSkinAccess, normalizeSkinProfile, PREMIUM_SKINS, selectedSkin, SKIN_ACCESS_MODE,
  SKIN_BY_HERO, SKIN_CATALOG_VERSION,
} from '../src/data/skins.js';
import { ALL_UPGRADES } from '../src/data/upgrades.js';
import { activePresentationRecipe, presentationCoverage } from '../src/game/UpgradePresentationProfiles.js';
import { AUDIO_BANK_EVENTS } from '../src/game/WeaponAudioProfiles.js';
import { PremiumWeaponAudio, weaponSoundProfile } from '../src/game/PremiumWeaponAudio.js';
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
    for (const asset of [skin.packArt, skin.voice, skin.vfxAtlas]) {
      const path = asset.split('?')[0].replace(/^\.\//, '../');
      const url = new URL(path, import.meta.url);
      await access(url);
      assert.ok((await stat(url)).size > 1024);
    }
    const vfxPath = skin.vfxAtlas.split('?')[0].replace(/^\.\//, '../');
    const metadata = await sharp(fileURLToPath(new URL(vfxPath, import.meta.url))).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1024, 1024, true]);
    const raw = await sharp(fileURLToPath(new URL(vfxPath, import.meta.url))).ensureAlpha().raw().toBuffer();
    for (let offset = 0; offset < 1024; offset += 256) {
      for (let pixel = 0; pixel < 1024; pixel += 1) {
        assert.equal(raw[((offset * 1024) + pixel) * 4 + 3], 0, 'horizontal cell gutter must be transparent');
        assert.equal(raw[((pixel * 1024) + offset) * 4 + 3], 0, 'vertical cell gutter must be transparent');
      }
    }

    const audioUrl = new URL(skin.audioBank.replace(/^\.\//, '../'), import.meta.url);
    const audioFiles = (await readdir(audioUrl)).filter((file) => file.endsWith('.wav'));
    const expectedCount = Object.values(AUDIO_BANK_EVENTS).reduce((sum, count) => sum + count, 0);
    assert.equal(audioFiles.length, expectedCount);
    let bytes = 0;
    for (const file of audioFiles) bytes += (await stat(new URL(`${audioUrl.href}/${file}`))).size;
    assert.ok(bytes < 1_500_000, 'one selected skin audio bank must stay mobile-safe');
  }
});

test('every upgrade has an authored visual and audio recipe across all skin and weapon combinations', () => {
  const coverage = presentationCoverage(ALL_UPGRADES);
  assert.equal(coverage.length, 51);
  assert.ok(coverage.every(({ presentation }) => presentation?.frame >= 0
    && presentation.audio && presentation.channels.length));
  const authoredSignatures = new Set(coverage.map(({ presentation }) => [
    presentation.family, presentation.frame, presentation.tier, presentation.audioRate,
    presentation.rotation,
  ].join(':')));
  assert.equal(authoredSignatures.size, 51, 'each upgrade needs an authored presentation signature');
  for (const skin of Object.values(PREMIUM_SKINS)) {
    for (const weaponId of ['revolver', 'shotgun', 'crossbow', 'flame']) {
      for (const upgrade of ALL_UPGRADES) {
        const state = { weapon: { id: weaponId }, owned: new Set([upgrade.id]), flags: {} };
        const recipe = activePresentationRecipe(state);
        const audio = weaponSoundProfile(weaponId, skin, state);
        assert.ok(recipe.audioAccents.length, `${skin.id}/${weaponId}/${upgrade.id}`);
        assert.ok(audio.premium && audio.gain > 0 && audio.duration > 0);
      }
    }
  }
});

test('semantic combat paths retain premium presentation coverage and pooled budgets', async () => {
  const files = [
    'CombatSystem.js', 'CombatEffects.js', 'SummonSystem.js', 'CharacterAbilitySystem.js',
    'UpgradeEffectSystem.js',
  ];
  const sources = await Promise.all(files.map((file) => import('node:fs/promises')
    .then(({ readFile }) => readFile(new URL(`../src/game/${file}`, import.meta.url), 'utf8'))));
  const combat = sources.join('\n');
  for (const event of [
    'rear', 'fan', 'splinter', 'ricochet', 'summon', 'scythe', 'ice', 'fireball',
    'shatter', 'glare', 'gale', 'blazing', 'shield', 'dash',
  ]) {
    assert.match(combat, new RegExp(`['\"]${event}['\"]`), `missing ${event} presentation path`);
  }
  const director = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../src/game/PremiumVfxDirector.js', import.meta.url), 'utf8'));
  const audio = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../src/game/PremiumWeaponAudio.js', import.meta.url), 'utf8'));
  assert.match(director, /this\.pool/);
  assert.doesNotMatch(director, /tweens\.add/);
  assert.match(audio, /reserveVoice\(priority\)/);
  assert.match(audio, /lowest >= priority/);
  assert.match(audio, /this\.htmlVoice\?\.pause/);
  const weaponPresentation = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../src/game/WeaponPresentation.js', import.meta.url), 'utf8'));
  assert.match(weaponPresentation, /if \(skin\) \{[^]*return;/);
  assert.match(weaponPresentation, /if \(bullet\?\.skin\) return;/);
});

test('intro voice is owned by the scene audio lifecycle and stops on destroy', () => {
  class FakeAudio {
    constructor() { FakeAudio.last = this; }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const host = { Audio: FakeAudio, addEventListener() {}, removeEventListener() {} };
  const audio = new PremiumWeaponAudio({ environment: host });
  assert.equal(audio.playVoice('intro', { voice: 'intro.wav', voicePitch: 1 }), true);
  audio.destroy();
  assert.equal(FakeAudio.last.paused, true);
  assert.equal(FakeAudio.last.currentTime, 0);
});

test('the runtime lazy-loads only the selected premium atlas and selected audio bank', async () => {
  const boot = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../src/game/BootScene.js', import.meta.url), 'utf8'));
  const game = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../src/game/GameScene.js', import.meta.url), 'utf8'));
  assert.doesNotMatch(boot, /PREMIUM_SKINS|vfxAtlas/);
  assert.match(game, /PREMIUM_SKINS\[this\.selection\?\.skinId\]/);
  assert.match(game, /this\.load\.spritesheet\(skin\.vfxKey, skin\.vfxAtlas/);
  assert.match(game, /preloadSkin\?\.\(this\.state\.skin\)/);
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
