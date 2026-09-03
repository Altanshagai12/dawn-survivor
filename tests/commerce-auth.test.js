import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForCommerceAuth } from '../src/commerce/auth.js?build=20260903e';
import { initPlatform } from '../src/platform/usion.js?build=20260903e';
import { commerceFixture } from './helpers/skin-commerce-fixture.js';

test('waits for late first INIT and subsequent token without making a request', async () => {
  let waits = 0, token = null;
  const platform = { embedded: false, awaitingHost: true, getAuthToken: () => token };
  const result = await waitForCommerceAuth(platform, null, { attempts: 3, pause: async () => {
    waits += 1;
    if (waits === 1) platform.embedded = true;
    if (waits === 2) token = 'late-token';
  } });
  assert.equal(result, 'late-token');
  assert.equal(waits, 2);
});

test('credential waits are bounded and a standalone game never polls', async () => {
  let waits = 0;
  const options = { attempts: 2, pause: async () => { waits += 1; } };
  assert.equal(await waitForCommerceAuth({ embedded: false }, null, options), null);
  assert.equal(waits, 0);
  const platform = { embedded: true, getAuthToken: () => 'expired' };
  assert.equal(await waitForCommerceAuth(platform, 'expired', options), null);
  assert.equal(waits, 2);
});

test('a timed-out adapter recovers host storage and live identity on late INIT', async (t) => {
  const previous = globalThis.window;
  let lateInit, saved = null;
  const sdk = {
    config: {}, init: async (callback) => { lateInit = callback; throw new Error('INIT_TIMEOUT'); },
    storage: { get: async () => ({ runs: 4 }), set: async (_key, profile) => { saved = profile; } },
    user: { getToken: () => sdk.config.authToken },
  };
  globalThis.window = { Usion: sdk, parent: {} };
  t.after(() => { globalThis.window = previous; });
  const platform = await initPlatform();
  assert.equal(platform.embedded, false);
  assert.equal(platform.awaitingHost, true);
  sdk.config = { serviceId: 'dawn-fixture', authToken: 'first', language: 'mn' };
  lateInit(sdk.config);
  assert.equal(platform.embedded, true);
  assert.equal(platform.config.serviceId, 'dawn-fixture');
  assert.deepEqual(await platform.loadProfile(), { runs: 4 });
  await platform.saveProfile({ runs: 5 });
  assert.deepEqual(saved, { runs: 5 });
  sdk.config.authToken = 'rotated';
  assert.equal(platform.getAuthToken(), 'rotated');
});

test('first refresh waits for a token and becomes ready without a second user action', async () => {
  const f = commerceFixture();
  f.state.token = null;
  f.commerce.authWait = (p, previous) => waitForCommerceAuth(p, previous, {
    attempts: 2, pause: async () => { f.state.token = 'arrived'; },
  });
  await f.commerce.refresh();
  assert.equal(f.commerce.ready, true);
  assert.equal(f.state.requests.length, 1);
  assert.equal(f.state.requests[0].options.headers.Authorization, 'Bearer arrived');
  assert.equal(f.state.charges.length, 0);
});

test('401 read retries once with a rotated token, never with the same token', async () => {
  for (const rotate of [true, false]) {
    const f = commerceFixture();
    let reads = 0;
    f.commerce.fetcher = async (url, options) => {
      reads += 1;
      if (reads === 1) {
        if (rotate) f.state.token = 'fresh';
        return new Response(JSON.stringify({ detail: 'Token expired' }), { status: 401 });
      }
      return f.fetcher(url, options);
    };
    if (rotate) { await f.commerce.refresh(); assert.equal(f.commerce.ready, true); }
    else await assert.rejects(f.commerce.refresh());
    assert.equal(reads, rotate ? 2 : 1);
    assert.equal(f.state.charges.length, 0);
  }
});

test('verified guests do not retry, and a 401 never automatically replays a mutation', async () => {
  for (const guest of [true, false]) {
    const f = commerceFixture();
    let requests = 0;
    const code = guest ? 'LOGIN_REQUIRED' : 'TOKEN_EXPIRED';
    f.commerce.fetcher = async () => {
      requests += 1; f.state.token = `rotated-${requests}`;
      return new Response(JSON.stringify({ detail: { code } }), { status: 401 });
    };
    await assert.rejects(f.commerce.request(guest ? '/state' : '/orders', guest ? undefined : {}), { code });
    assert.equal(requests, 1);
    assert.equal(f.state.charges.length, 0);
  }
});
