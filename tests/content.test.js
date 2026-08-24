import assert from 'node:assert/strict';
import test from 'node:test';
import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { BOSSES, ENEMIES, RUN_SECONDS, availableEnemies } from '../src/data/enemies.js';
import { UPGRADES, eligibleUpgrades } from '../src/data/upgrades.js';
import { ENEMY_ATLASES } from '../src/config/assets.js';

test('ships a full ten-minute content set', () => {
  assert.equal(RUN_SECONDS, 600);
  assert.equal(Object.keys(HEROES).length, 4);
  assert.equal(Object.keys(WEAPONS).length, 4);
  assert.equal(Object.keys(ENEMIES).length, 8);
  assert.equal(Object.keys(BOSSES).length, 3);
  assert.equal(UPGRADES.length, 56);
});

test('boss encounters land at minutes two, five, and nine', () => {
  assert.deepEqual(Object.values(BOSSES).map(({ spawnAt }) => spawnAt), [120, 300, 540]);
});

test('upgrade trees unlock one tier at a time', () => {
  const initial = eligibleUpgrades(new Set());
  assert.equal(initial.length, 14);
  assert.ok(initial.every(({ tier }) => tier === 1));

  const owned = new Set(['power-1']);
  const next = eligibleUpgrades(owned);
  assert.ok(next.some(({ id }) => id === 'power-2'));
  assert.ok(!next.some(({ id }) => id === 'power-3'));
});

test('multi-shot and ricochet trees follow the original branching order', () => {
  const multiTier2 = eligibleUpgrades(new Set(['double-1']));
  assert.ok(multiTier2.some(({ id }) => id === 'double-2'));
  assert.ok(multiTier2.some(({ id }) => id === 'double-3'));
  assert.ok(!multiTier2.some(({ id }) => id === 'double-4'));
  assert.ok(eligibleUpgrades(new Set(['double-1', 'double-2', 'double-3']))
    .some(({ id }) => id === 'double-4'));

  const rapidTier2 = eligibleUpgrades(new Set(['rapid-1']));
  assert.ok(rapidTier2.some(({ id }) => id === 'rapid-2'));
  assert.ok(rapidTier2.some(({ id }) => id === 'rapid-3'));
  assert.ok(!rapidTier2.some(({ id }) => id === 'rapid-4'));
});

test('enemy roster grows throughout the run', () => {
  assert.deepEqual(availableEnemies(0).map(({ id }) => id), ['creeper']);
  assert.equal(availableEnemies(180).length, 5);
  assert.equal(availableEnemies(600).length, 8);
});

test('every upgrade choice includes a visual icon', () => {
  assert.ok(UPGRADES.every(({ icon }) => typeof icon === 'string' && icon.length > 0));
  assert.ok(Object.values(HEROES).flatMap(({ chest }) => chest)
    .every(({ icon }) => typeof icon === 'string' && icon.length > 0));
});

test('keeps the two approved base enemies untouched and cleans later atlases', () => {
  assert.ok(!ENEMY_ATLASES.creeper.file.includes('-clean'));
  assert.ok(!ENEMY_ATLASES.crawler.file.includes('-clean'));
  assert.ok(Object.entries(ENEMY_ATLASES)
    .filter(([id]) => !['creeper', 'crawler'].includes(id))
    .every(([, atlas]) => atlas.file.includes('-clean.webp')));
});
