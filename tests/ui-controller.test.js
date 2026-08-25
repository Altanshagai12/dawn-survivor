import assert from 'node:assert/strict';
import test from 'node:test';
import {
  damageSourceLabel, heroPassiveCopy, movementCopy, savedOrDefault, UIController,
  upgradeIconHtml, upgradePathHtml, weaponIconSvg,
} from '../src/ui/UIController.js';

function classList() {
  return { add() {}, remove() {}, toggle() {} };
}

test('falls back from a removed saved loadout without blocking boot', () => {
  const heroes = { nyra: {} };
  const weapons = { revolver: {} };
  const profile = { selectedHero: 'missing-hero', selectedWeapon: 'smgs' };
  assert.equal(savedOrDefault(heroes, profile.selectedHero, 'nyra'), 'nyra');
  assert.equal(savedOrDefault(weapons, profile.selectedWeapon, 'revolver'), 'revolver');
});

test('every core weapon has a code-native selection icon', () => {
  ['revolver', 'shotgun', 'crossbow', 'flame'].forEach((id) => {
    assert.match(weaponIconSvg(id), /<svg[^>]*>.+<\/svg>/);
  });
});

test('generated upgrade frames map to the 10 by 10 atlas', () => {
  assert.match(upgradeIconHtml({ iconFrame: 0 }), /choice-card__icon--atlas/);
  assert.match(upgradeIconHtml({ iconFrame: 99 }), /background-position:100% 100%/);
});

test('upgrade cards show all four nodes in their progression path', () => {
  const html = upgradePathHtml({ tree: 'power', iconFrame: 6 }, new Set(['power-1']));
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
      'choice-confirm': { textContent: '', onclick: null },
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
    assert.equal(controller.el['choice-detail-tree'].textContent, 'ХҮЧ');
    assert.equal(controller.el['choice-detail-name'].textContent, 'Хүчтэй сум');
    list.children[1].listeners.click();
    assert.equal(controller.el['choice-detail-name'].textContent, 'Шуурхай');
    assert.equal(list.children[1].attributes['aria-selected'], 'true');
    controller.el['choice-confirm'].onclick();
    assert.deepEqual(await result, { card: cards[1], reroll: false });
  } finally {
    globalThis.document = previousDocument;
  }
});
