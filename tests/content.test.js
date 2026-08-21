import assert from 'node:assert/strict';
import test from 'node:test';
import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { BOSSES, ENEMIES, RUN_SECONDS, availableEnemies } from '../src/data/enemies.js';
import { UPGRADES, eligibleUpgrades } from '../src/data/upgrades.js';

test('ships a full ten-minute content set', () => {
  assert.equal(RUN_SECONDS, 600);
  assert.equal(Object.keys(HEROES).length, 4);
  assert.equal(Object.keys(WEAPONS).length, 4);
  assert.equal(Object.keys(ENEMIES).length, 8);
  assert.equal(Object.keys(BOSSES).length, 3);
  assert.equal(UPGRADES.length, 52);
});

test('boss encounters land at minutes two, five, and nine', () => {
  assert.deepEqual(Object.values(BOSSES).map(({ spawnAt }) => spawnAt), [120, 300, 540]);
});

test('upgrade trees unlock one tier at a time', () => {
  const initial = eligibleUpgrades(new Set());
  assert.equal(initial.length, 13);
  assert.ok(initial.every(({ tier }) => tier === 1));

  const owned = new Set(['power-1']);
  const next = eligibleUpgrades(owned);
  assert.ok(next.some(({ id }) => id === 'power-2'));
  assert.ok(!next.some(({ id }) => id === 'power-3'));
});

test('enemy roster grows throughout the run', () => {
  assert.deepEqual(availableEnemies(0).map(({ id }) => id), ['creeper']);
  assert.equal(availableEnemies(180).length, 5);
  assert.equal(availableEnemies(600).length, 8);
});
