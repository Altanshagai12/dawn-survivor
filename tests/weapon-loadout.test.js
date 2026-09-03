import assert from 'node:assert/strict';
import test from 'node:test';

import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { weaponSkinOptions } from '../src/data/weaponSkins.js';
import { bindSkinSwipe, skinSwipeStep } from '../src/ui/skinSwipe.js';
import { UIController } from '../src/ui/UIController.js';
import { WeaponLoadoutController } from '../src/ui/WeaponLoadoutController.js';

function element() {
  const listeners = new Map();
  const descendants = new Map();
  const classes = new Set();
  const captures = new Set();
  return {
    dataset: {}, attributes: {}, textContent: '', children: [],
    style: { setProperty() {} },
    classList: {
      contains: (name) => classes.has(name),
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    replaceChildren(...children) { this.children = children; },
    querySelector(selector) {
      if (!descendants.has(selector)) descendants.set(selector, element());
      return descendants.get(selector);
    },
    querySelectorAll() { return ['previous', 'next'].map((key) => this.querySelector(`.skin-arrow--${key}`)); },
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
    addEventListener(type, callback, capture = false) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ callback, capture });
    },
    fire(type, fields = {}) {
      const event = {
        pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, detail: 1,
        defaultPrevented: false, stopped: false, ...fields,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.stopped = true; },
      };
      const ordered = [...(listeners.get(type) || [])].sort((a, b) => Number(b.capture) - Number(a.capture));
      for (const { callback } of ordered) { callback(event); if (event.stopped) break; }
      return event;
    },
  };
}

function loadout(t, saveProfile = async () => true, language = 'en') {
  const previous = globalThis.document;
  const nodes = new Map();
  globalThis.document = {
    documentElement: element(), createElement: element,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
  };
  t.after(() => { globalThis.document = previous; });
  const ui = {
    heroes: HEROES, weapons: WEAPONS, i18n: { lang: language }, profile: {},
    selectedHero: 'shana', selectedWeapon: 'revolver',
    el: Object.fromEntries(['hero-list', 'weapon-list'].map((id) => [id, element()])),
  };
  const controller = new WeaponLoadoutController({ ui, platform: { saveProfile } });
  controller.render();
  return controller;
}

function swipe(target, end, start = {}) {
  target.fire('pointerdown', start);
  target.fire('pointerup', end);
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

for (const [lang, copy] of Object.entries({
  en: ['Reroll · once per level', 'Starts with 6 HP', 'Every 3rd shot → fire', 'Dash → shooting clone'],
  mn: ['Reroll · level бүр 1 удаа', '6 амьтай эхэлнэ', '3 дахь буудалт бүр → гал', 'Dash → бууддаг хуулбар'],
})) {
  test(`all four hero abilities are visible without hover and accessible in ${lang}`, async (t) => {
    const controller = loadout(t, undefined, lang);
    for (const [index, hero] of Object.values(HEROES).entries()) {
      const button = controller.heroButtons.get(hero.id);
      assert.ok(button.innerHTML.includes(`id="hero-ability-${hero.id}">${copy[index]}</span>`));
      assert.equal(button.dataset.ability, hero.passive);
      assert.equal(button.attributes['aria-describedby'], `hero-ability-${hero.id}`);
      assert.equal(button.attributes['aria-label'], lang === 'mn' ? hero.nameMn : hero.name);
      button.fire('click');
      assert.equal(button.attributes['aria-pressed'], 'true');
      assert.equal(controller.profile.selectedHero, hero.id);
    }
    await controller.saveQueue;
  });
}

test('swipe direction follows the visible carousel in horizontal and CSS-rotated layouts', () => {
  const start = { clientX: 100, clientY: 100 };
  assert.equal(skinSwipeStep(start, { clientX: 50, clientY: 103 }), 1);
  assert.equal(skinSwipeStep(start, { clientX: 150, clientY: 103 }), -1);
  assert.equal(skinSwipeStep(start, { clientX: 103, clientY: 50 }, true), 1);
  assert.equal(skinSwipeStep(start, { clientX: 103, clientY: 150 }, true), -1);
});

test('swipes require a 24px intentional movement and reject perpendicular or diagonal drags', () => {
  const start = { clientX: 0, clientY: 0 };
  for (const rotated of [false, true]) {
    const point = (along, across) => rotated
      ? { clientX: across, clientY: along } : { clientX: along, clientY: across };
    assert.equal(skinSwipeStep(start, point(23.99, 0), rotated), 0);
    assert.equal(skinSwipeStep(start, point(24, 0), rotated), -1);
    assert.equal(skinSwipeStep(start, point(30, 30), rotated), 0);
    assert.equal(skinSwipeStep(start, point(0, 80), rotated), 0);
    assert.equal(skinSwipeStep(start, point(24, 20), rotated), -1);
  }
});

test('cancelled and lost-capture gestures do not change skins, and a fresh gesture still works', () => {
  const stage = element();
  const changes = [];
  bindSkinSwipe(stage, { active: () => true, rotated: () => false, change: (step) => changes.push(step) });
  for (const cancellation of ['pointercancel', 'lostpointercapture']) {
    stage.fire('pointerdown');
    stage.fire(cancellation);
    stage.fire('pointerup', { clientX: 20 });
  }
  assert.deepEqual(changes, []);
  swipe(stage, { clientX: 20 });
  assert.deepEqual(changes, [1]);
  assert.equal(stage.hasPointerCapture(1), false);
});

test('secondary pointers and right-button presses cannot start or hijack a swipe', () => {
  const stage = element();
  const changes = [];
  bindSkinSwipe(stage, { active: () => true, rotated: () => false, change: (step) => changes.push(step) });
  swipe(stage, { pointerId: 2, clientX: 20 }, { pointerId: 2, isPrimary: false });
  swipe(stage, { clientX: 20 }, { button: 2 });
  assert.deepEqual(changes, []);
  stage.fire('pointerdown');
  assert.equal(stage.hasPointerCapture(1), true);
  stage.fire('pointerdown', { pointerId: 2, isPrimary: false, clientX: 200 });
  stage.fire('pointerup', { pointerId: 2, clientX: 10 });
  assert.deepEqual(changes, []);
  stage.fire('pointerup', { clientX: 20 });
  assert.deepEqual(changes, [1]);
});

test('only active cards handle arrows or swipes, and a completed swipe suppresses one pointer click', () => {
  const stage = element();
  const changes = [];
  let active = false;
  let clicks = 0;
  stage.addEventListener('click', () => { clicks += 1; });
  bindSkinSwipe(stage, { active: () => active, rotated: () => false, change: (step) => changes.push(step) });
  assert.equal(stage.fire('keydown', { key: 'ArrowRight' }).defaultPrevented, false);
  swipe(stage, { clientX: 20 });
  assert.deepEqual(changes, []);
  active = true;
  assert.equal(stage.fire('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(stage.fire('keydown', { key: 'ArrowLeft' }).defaultPrevented, true);
  assert.equal(stage.fire('keydown', { key: 'Enter' }).defaultPrevented, false);
  swipe(stage, { clientX: 20 });
  const click = stage.fire('click');
  assert.equal(click.defaultPrevented, true);
  assert.equal(click.stopped, true);
  assert.equal(clicks, 0);
  stage.fire('click', { detail: 0 });
  assert.equal(clicks, 1, 'subsequent keyboard activation is not swallowed');
  assert.deepEqual(changes, [1, -1, 1]);
  stage.fire('pointerdown');
  active = false;
  stage.fire('pointerup', { clientX: 20 });
  assert.deepEqual(changes, [1, -1, 1], 'deactivation during a drag cancels its change');
});

test('weapon cards cycle only while selected, wrap through original, and honor rotated gestures', async (t) => {
  const controller = loadout(t);
  const shotgun = controller.cards.get('shotgun');
  const revolver = controller.cards.get('revolver');
  assert.equal(shotgun.querySelector('.skin-arrow--next').disabled, true);
  controller.cycleSkin('shotgun', 1);
  assert.equal(controller.profile.equippedWeaponSkins.shotgun, null);
  revolver.querySelector('.skin-arrow--previous').fire('click');
  const options = weaponSkinOptions(controller.profile, 'revolver');
  assert.equal(controller.profile.equippedWeaponSkins.revolver, options.at(-1).id);
  revolver.querySelector('.skin-arrow--next').fire('click');
  assert.equal(controller.profile.equippedWeaponSkins.revolver, null);
  shotgun.querySelector('.weapon-stage').fire('click');
  assert.equal(controller.ui.selectedWeapon, 'shotgun');
  assert.equal(controller.profile.selectedWeapon, 'shotgun');
  assert.equal(shotgun.querySelector('.skin-arrow--next').disabled, false);
  document.documentElement.classList.toggle('mobile-rotated', true);
  swipe(shotgun.querySelector('.weapon-stage'), { clientY: 20 });
  assert.equal(controller.profile.equippedWeaponSkins.shotgun, options[1].id);
  assert.equal(shotgun.dataset.skin, options[1].id);
  assert.equal(shotgun.querySelector('.weapon-art').src, options[1].weaponArt.shotgun);
  await controller.saveQueue;
});

test('gun choices remain independent when changing heroes and the game selection retains the original hero', async (t) => {
  const controller = loadout(t);
  const options = weaponSkinOptions(controller.profile, 'revolver');
  controller.cycleSkin('revolver', 1);
  controller.selectWeapon('shotgun');
  controller.cycleSkin('shotgun', 1);
  controller.cycleSkin('shotgun', 1);
  controller.heroButtons.get('hina').fire('click');
  assert.equal(controller.profile.equippedWeaponSkins.revolver, options[1].id);
  assert.equal(controller.profile.equippedWeaponSkins.shotgun, options[2].id);
  assert.deepEqual(UIController.prototype.selection.call(controller.ui), {
    heroId: 'hina', weaponId: 'shotgun', skinId: options[2].id,
  });
  controller.selectWeapon('revolver');
  assert.equal(UIController.prototype.selection.call(controller.ui).skinId, options[1].id);
  controller.selectWeapon('flame');
  assert.deepEqual(UIController.prototype.selection.call(controller.ui), {
    heroId: 'hina', weaponId: 'flame', skinId: null,
  });
  await controller.saveQueue;
});

test('failed saves preserve selections and clicking the status retries false or rejected requests', async (t) => {
  const snapshots = [];
  const results = [false, new Error('offline'), true];
  const controller = loadout(t, async (profile) => {
    snapshots.push(structuredClone(profile));
    const result = results.shift();
    if (result instanceof Error) throw result;
    return result;
  });
  assert.equal(controller.saveStatus.classList.contains('hidden'), true);
  assert.equal(controller.saveStatus.disabled, true);
  controller.cycleSkin('revolver', 1);
  assert.equal(controller.saveStatus.textContent, controller.copy.saving);
  await controller.saveQueue;
  assert.equal(controller.saveStatus.textContent, controller.copy.failed);
  assert.equal(controller.saveStatus.classList.contains('hidden'), false);
  assert.equal(controller.saveStatus.disabled, false);
  const equipped = controller.profile.equippedWeaponSkins.revolver;
  for (const expected of [controller.copy.failed, controller.copy.saved]) {
    controller.saveStatus.fire('click');
    await controller.saveQueue;
    assert.equal(controller.saveStatus.textContent, expected);
    assert.equal(controller.profile.equippedWeaponSkins.revolver, equipped);
    assert.equal(controller.saveStatus.classList.contains('hidden'), expected !== controller.copy.failed);
  }
  assert.equal(snapshots.length, 3);
  assert.ok(snapshots.every((profile) => profile.equippedWeaponSkins.revolver === equipped));
});

test('saves are serialized and the latest queued selection is not reported saved before it finishes', async (t) => {
  const gates = [deferred(), deferred()];
  const started = [deferred(), deferred()];
  const snapshots = [];
  let active = 0;
  let peak = 0;
  const controller = loadout(t, async (profile) => {
    const index = snapshots.length;
    snapshots.push(structuredClone(profile));
    active += 1;
    peak = Math.max(peak, active);
    started[index].resolve();
    await gates[index].promise;
    active -= 1;
    return true;
  });
  controller.cycleSkin('revolver', 1);
  await started[0].promise;
  controller.cycleSkin('revolver', 1);
  assert.equal(snapshots.length, 1);
  gates[0].resolve();
  await started[1].promise;
  assert.equal(peak, 1);
  assert.notEqual(snapshots[0].equippedWeaponSkins.revolver, snapshots[1].equippedWeaponSkins.revolver);
  assert.equal(snapshots[1].equippedWeaponSkins.revolver, controller.profile.equippedWeaponSkins.revolver);
  const intermediateStatus = controller.saveStatus.textContent;
  gates[1].resolve();
  await controller.saveQueue;
  assert.equal(intermediateStatus, controller.copy.saving);
  assert.equal(controller.saveStatus.textContent, controller.copy.saved);
});
