import { HEROES } from '../src/data/heroes.js?build=20260828i';
import { WEAPONS } from '../src/data/weapons.js?build=20260827b';
import { WeaponLoadoutController } from '../src/ui/WeaponLoadoutController.js?build=20260903f';
import { installAutoLandscape } from '../src/ui/orientation.js?build=20260826b';
import { commerceFixture } from './helpers/skin-commerce-fixture.js';

const fixture = commerceFixture();
const params = new URLSearchParams(location.search);
if (params.has('phone')) {
  // Exercise the production rotation path under desktop browser automation.
  const nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) => query === '(pointer: coarse)' ? { matches: true } : nativeMatchMedia(query);
}
installAutoLandscape();
const ui = { heroes: HEROES, weapons: WEAPONS, i18n: { lang: params.get('lang') || 'mn' },
  profile: fixture.profile, selectedHero: 'shana', selectedWeapon: 'revolver',
  el: Object.fromEntries(['hero-list', 'weapon-list'].map((id) => [id, document.getElementById(id)])) };
const originalPayment = fixture.platform.requestPayment;
fixture.platform.requestPayment = async (...args) => {
  const result = await originalPayment(...args);
  document.getElementById('fixture-result').textContent = `${fixture.state.charges.length} simulated payments · ${fixture.state.charges.reduce((total, charge) => total + charge.amount, 0)}₮ · NO REAL MONEY`;
  return result;
};
const controller = new WeaponLoadoutController({ ui, platform: fixture.platform, commerce: fixture.commerce });
await fixture.commerce.refresh();
controller.render();
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('fixture-result').textContent = JSON.stringify(fixture.profile.equippedWeaponSkins);
});
