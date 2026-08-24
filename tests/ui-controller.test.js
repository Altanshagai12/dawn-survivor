import assert from 'node:assert/strict';
import test from 'node:test';
import { UIController } from '../src/ui/UIController.js';

function classList() {
  return { add() {}, remove() {}, toggle() {} };
}

test('upgrade choices render their icon and localized tree label', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return { className: '', innerHTML: '', addEventListener() {} };
    },
  };
  try {
    const list = {
      children: [],
      replaceChildren(...children) { this.children = children; },
    };
    const controller = Object.create(UIController.prototype);
    controller.i18n = { lang: 'mn', t: () => 'Сайжруулалтаа сонго' };
    controller.el = {
      'choice-kicker': {},
      'choice-title': {},
      'choice-list': list,
      'choice-modal': { classList: classList() },
      'reroll-button': { classList: classList(), onclick: null },
    };

    controller.choose([{
      icon: '✹', treeLabel: 'POWER', treeLabelMn: 'ХҮЧ',
      name: 'Impact Rounds', nameMn: 'Хүчтэй сум',
      desc: 'Bullet damage +25%.', descMn: 'Сумны гэмтэл +25%.',
    }]);

    assert.match(list.children[0].innerHTML, /choice-card__icon[^>]*>✹</);
    assert.match(list.children[0].innerHTML, />ХҮЧ</);
    assert.match(list.children[0].innerHTML, />Хүчтэй сум</);
  } finally {
    globalThis.document = previousDocument;
  }
});
