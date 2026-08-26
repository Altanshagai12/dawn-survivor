import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCKED_SURFACE_EVENTS, installInteractionGuards } from '../src/ui/interactionGuards.js';

test('game-surface guards block zoom, selection, dragging, and long-press menus', () => {
  const listeners = new Map();
  const target = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
  const uninstall = installInteractionGuards(target);
  BLOCKED_SURFACE_EVENTS.forEach((type) => {
    let blocked = false;
    listeners.get(type)({ preventDefault() { blocked = true; } });
    assert.equal(blocked, true, `${type} should be blocked`);
  });
  let wheelBlocked = false;
  listeners.get('wheel')({ ctrlKey: true, preventDefault() { wheelBlocked = true; } });
  assert.equal(wheelBlocked, true);
  uninstall();
  assert.equal(listeners.size, 0);
});
