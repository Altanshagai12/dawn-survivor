import assert from 'node:assert/strict';
import test from 'node:test';

import { singleFlight, startFreshRun } from '../src/game/runLifecycle.js';

test('replay stops the ended game scene before starting a fresh run', () => {
  const calls = [];
  const sceneManager = {
    isActive: () => true,
    isPaused: () => false,
    isSleeping: () => false,
    stop: (key) => calls.push(['stop', key]),
    start: (key, selection) => calls.push(['start', key, selection]),
  };
  const selection = { heroId: 'shana', weaponId: 'revolver' };

  startFreshRun(sceneManager, selection);

  assert.deepEqual(calls, [
    ['stop', 'game'],
    ['start', 'game', selection],
  ]);
});

test('first run starts directly when the game scene has never run', () => {
  const calls = [];
  const sceneManager = {
    isActive: () => false,
    isPaused: () => false,
    isSleeping: () => false,
    stop: (key) => calls.push(['stop', key]),
    start: (key, selection) => calls.push(['start', key, selection]),
  };

  startFreshRun(sceneManager, { heroId: 'hina' });

  assert.deepEqual(calls, [['start', 'game', { heroId: 'hina' }]]);
});

test('rapid replay presses launch only one run', async () => {
  let release;
  let launches = 0;
  const wait = new Promise((resolve) => { release = resolve; });
  const launch = singleFlight(async () => {
    launches += 1;
    await wait;
  });

  const first = launch();
  const duplicate = launch();
  assert.equal(await duplicate, false);
  assert.equal(launches, 1);

  release();
  assert.equal(await first, true);
});
