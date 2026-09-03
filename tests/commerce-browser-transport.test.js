import assert from 'node:assert/strict';
import test from 'node:test';
import { SkinCommerce } from '../src/commerce/SkinCommerce.js?build=20260903f';
import { commerceFixture } from './helpers/skin-commerce-fixture.js';
import { hasWeaponSkinAccess } from '../src/data/weaponSkins.js?build=20260903d';

test('default native fetch receiver survives state, order and completion requests', async (t) => {
  const original = globalThis.fetch;
  const f = commerceFixture();
  globalThis.fetch = function (url, options) {
    // Browser Window.fetch enforces this receiver; Node's fetch does not.
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return f.fetcher(url, options);
  };
  t.after(() => { globalThis.fetch = original; });
  const commerce = new SkinCommerce({ platform: f.platform, profile: f.profile });
  await commerce.refresh();
  assert.equal(commerce.ready, true);
  assert.equal(f.state.charges.length, 0);
  await commerce.purchase('shana-astral-warden', 'revolver');
  assert.equal(f.state.charges.length, 1);
  assert.equal(f.state.charges[0].amount, 500);
  assert.ok(hasWeaponSkinAccess(f.profile, 'revolver', 'shana-astral-warden'));
});
