import assert from 'node:assert/strict';
import test from 'node:test';
import {
  damageSourceLabel, formatSurvivalTime, heroPassiveCopy, leaderboardDurationMs, movementCopy, savedOrDefault,
  setFreshActivation, UIController, upgradeIconHtml, upgradePathHtml,
  survivalLeaderboardEntries,
} from '../src/ui/UIController.js';
import { WEAPONS } from '../src/data/weapons.js';

function classList() {
  return { add() {}, remove() {}, toggle() {} };
}

test('falls back from a removed saved loadout without blocking boot', () => {
  const heroes = { shana: {} };
  const weapons = { revolver: {} };
  const profile = { selectedHero: 'missing-hero', selectedWeapon: 'smgs' };
  assert.equal(savedOrDefault(heroes, profile.selectedHero, 'shana'), 'shana');
  assert.equal(savedOrDefault(weapons, profile.selectedWeapon, 'revolver'), 'revolver');
});

test('every core weapon has normalized generated selection art', () => {
  assert.deepEqual(Object.keys(WEAPONS), ['revolver', 'shotgun', 'crossbow', 'flame']);
  Object.values(WEAPONS).forEach((weapon) => {
    assert.match(weapon.art, /^\.\/assets\/ui\/weapons\/.+\.webp\?build=20260827b$/);
  });
});

test('generated upgrade frames map to the 10 by 10 atlas', () => {
  assert.match(upgradeIconHtml({ iconFrame: 0 }), /choice-card__icon--atlas/);
  assert.match(upgradeIconHtml({ iconFrame: 99 }), /background-position:100% 100%/);
});

test('upgrade cards show all four nodes in their progression path', () => {
  const html = upgradePathHtml({
    id: 'big_shot', tree: 'power', iconFrame: 22,
    treeNodes: ['power_shot', 'splinter', 'big_shot', 'reaper_rounds'],
  }, new Set(['power_shot']));
  assert.equal((html.match(/choice-card__path-icon/g) || []).length, 4);
  assert.equal((html.match(/ owned/g) || []).length, 1);
  assert.equal((html.match(/ current/g) || []).length, 1);
});

test('loadout copy explains personal skills and firing movement speed', () => {
  assert.match(heroPassiveCopy({ passiveMn: 'Онцгой.' }, 'mn'), /ХУВИЙН ЧАДВАР · Онцгой/);
  assert.match(movementCopy('mn'), /Буудаж гүйх 50%/);
});

test('damage sources have readable English and Mongolian labels', () => {
  assert.equal(damageSourceLabel('tree-contact', 'en'), 'TREE ROOT');
  assert.equal(damageSourceLabel('enemy-projectile', 'mn'), 'ДАЙСНЫ СУМ');
  assert.equal(damageSourceLabel('missing', 'mn'), 'ҮЛ МЭДЭГДЭХ');
});

test('survival records render as a stable ten-minute clock', () => {
  assert.equal(formatSurvivalTime(0), '00:00');
  assert.equal(formatSurvivalTime(571_999), '09:31');
  assert.equal(formatSurvivalTime(600_000), '10:00');
});

test('leaderboard duration is optional and never inferred from a legacy score', () => {
  assert.equal(leaderboardDurationMs({ score: 900, metadata: { duration_ms: 315_840 } }), 315_840);
  assert.equal(leaderboardDurationMs({ score: 315_840, metadata: { metric: 'survival_ms' } }), 315_840);
  assert.equal(leaderboardDurationMs({ score: 900 }), null);
});

test('the result leaderboard excludes legacy score-only records', () => {
  const entries = survivalLeaderboardEntries([
    { name: 'Legacy', score: 900 },
    { name: 'Timed', score: 315_840, metadata: { metric: 'survival_ms' } },
  ]);

  assert.deepEqual(entries, [{
    entry: { name: 'Timed', score: 315_840, metadata: { metric: 'survival_ms' } },
    durationMs: 315_840,
  }]);
});

test('modal actions ignore an inherited pointer click and require a fresh press', () => {
  const button = {};
  let activations = 0;
  setFreshActivation(button, () => { activations += 1; });
  button.onclick({ detail: 1 });
  assert.equal(activations, 0);
  button.onpointerdown({ pointerType: 'touch', preventDefault() {} });
  assert.equal(activations, 1);
  button.onclick({ detail: 1 });
  assert.equal(activations, 1);
  button.onclick({ detail: 0 });
  assert.equal(activations, 2);
});

test('upgrade choices use icon tabs, a localized detail panel, and explicit confirmation', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        className: '', innerHTML: '', attributes: {}, listeners: {}, classList: classList(),
        addEventListener(type, listener) { this.listeners[type] = listener; },
        setAttribute(name, value) { this.attributes[name] = value; },
      };
    },
  };
  try {
    const list = {
      children: [],
      style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
      replaceChildren(...children) { this.children = children; },
    };
    const controller = Object.create(UIController.prototype);
    controller.i18n = { lang: 'mn', t: () => 'Сайжруулалтаа сонго' };
    controller.el = {
      'choice-kicker': {},
      'choice-title': {},
      'choice-list': list,
      'choice-modal': { classList: classList() },
      'choice-detail-icon': { innerHTML: '' },
      'choice-detail-tree': { textContent: '' },
      'choice-detail-name': { textContent: '' },
      'choice-detail-description': { textContent: '' },
      'choice-detail-path': { innerHTML: '' },
      'choice-confirm': { textContent: '', onclick: null, disabled: false },
      'reroll-button': { classList: classList(), onclick: null },
    };

    const cards = [
      {
        icon: '✹', treeLabel: 'POWER', treeLabelMn: 'ХҮЧ',
        name: 'Impact Rounds', nameMn: 'Хүчтэй сум',
        desc: 'Bullet damage +25%.', descMn: 'Сумны гэмтэл +25%.',
      },
      {
        icon: 'ϟ', treeLabel: 'HASTE', treeLabelMn: 'ХУРД',
        name: 'Haste', nameMn: 'Шуурхай',
        desc: 'Move speed +20%.', descMn: 'Хөдөлгөөний хурд +20%.',
      },
    ];
    const result = controller.choose(cards);

    assert.match(list.children[0].innerHTML, /choice-card__icon[^>]*>✹</);
    assert.equal(list.style.values['--choice-count'], '2');
    assert.equal(list.children[1].attributes['aria-posinset'], '2');
    assert.equal(list.children[1].attributes['aria-setsize'], '2');
    assert.equal(list.children[0].attributes['aria-selected'], 'false');
    assert.equal(list.children[1].attributes['aria-selected'], 'false');
    assert.equal(controller.el['choice-detail-tree'].textContent, 'СОНГОЛТ');
    assert.equal(controller.el['choice-detail-name'].textContent, 'Сайжруулалтаа сонгоно уу');
    assert.equal(controller.el['choice-confirm'].disabled, true);
    controller.el['choice-confirm'].onpointerdown({ pointerType: 'touch', preventDefault() {} });
    let resolved = false;
    result.then(() => { resolved = true; });
    await Promise.resolve();
    assert.equal(resolved, false);
    list.children[1].onpointerdown({ pointerType: 'touch', preventDefault() {} });
    assert.equal(controller.el['choice-detail-name'].textContent, 'Шуурхай');
    assert.equal(list.children[1].attributes['aria-selected'], 'true');
    assert.equal(controller.el['choice-confirm'].disabled, false);
    controller.el['choice-confirm'].onclick({ detail: 1 });
    await Promise.resolve();
    assert.equal(resolved, false);
    controller.el['choice-confirm'].onpointerdown({ pointerType: 'touch', preventDefault() {} });
    assert.deepEqual(await result, { card: cards[1], reroll: false });
  } finally {
    globalThis.document = previousDocument;
  }
});
