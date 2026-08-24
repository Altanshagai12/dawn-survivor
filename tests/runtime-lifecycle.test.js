import assert from 'node:assert/strict';
import test from 'node:test';
import { installVisibleResume } from '../src/game/runtimeLifecycle.js';

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
}

test('resumes a focus-paused iframe only while the document is visible', () => {
  const doc = { ...eventTarget(), visibilityState: 'visible' };
  const win = eventTarget();
  const game = { isPaused: true, resumes: 0, resume() { this.resumes += 1; this.isPaused = false; } };
  const cleanup = installVisibleResume(game, { doc, win });

  win.listeners.get('pointerdown')();
  assert.equal(game.resumes, 1);

  game.isPaused = true;
  doc.visibilityState = 'hidden';
  doc.listeners.get('visibilitychange')();
  assert.equal(game.resumes, 1);

  cleanup();
  assert.equal(win.listeners.size, 0);
  assert.equal(doc.listeners.size, 0);
});
