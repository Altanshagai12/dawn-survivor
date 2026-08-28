import assert from 'node:assert/strict';
import test from 'node:test';
import { TEN_MINUTES_BALANCE, SPAWN_SESSIONS } from '../src/config/balance.js';
import { BOSS_ATLASES, ENEMY_ATLASES, STATIC_ASSETS } from '../src/config/assets.js';
import { BOSSES, ENEMIES, RUN_SECONDS } from '../src/data/enemies.js';
import { BASE_HERO_SPEED, HEROES } from '../src/data/heroes.js';
import {
  ALL_UPGRADES, TOMES, UPGRADES, UPGRADE_CHOICE_COUNT, UPGRADE_ICON_FRAMES, UPGRADE_TREES,
  eligibleUpgrades, sampleUpgradeCards,
} from '../src/data/upgrades.js';

test('ships the exact original ten-minute roster', () => {
  assert.equal(RUN_SECONDS, 600);
  assert.deepEqual(Object.keys(HEROES), ['shana', 'diamond', 'scarlett', 'hina']);
  assert.deepEqual(Object.values(HEROES).map(({ hp }) => hp), [3, 6, 2, 2]);
  assert.ok(Object.values(HEROES).every(({ speed }) => speed === BASE_HERO_SPEED));
  assert.deepEqual(Object.keys(ENEMIES), ['tentacle', 'boomer', 'eye']);
  assert.deepEqual(Object.keys(BOSSES), ['elder', 'shub']);
  assert.deepEqual(Object.values(BOSSES).map(({ spawnAt, hp }) => [spawnAt, hp]), [[180, 1000], [300, 3200]]);
});

test('every shipped upgrade name points at its authored icon family', () => {
  const expectedTrees = {
    pyro: [56, 57, 58, 59], frost: [52, 53, 54, 55], electro: [48, 49, 50, 51],
    ghost: [24, 25, 26, 27], weaponry: [36, 32, 35, 36], power: [4, 6, 5, 7],
    multi: [12, 13, 14, 15], rapid: [8, 9, 10, 11], reload: [16, 17, 18, 19],
    health: [68, 70, 69, 71], movement: [88, 89, 90, 91], shield: [72, 73, 74, 75],
  };
  UPGRADE_TREES.forEach((tree) => {
    assert.deepEqual(tree.map(({ iconFrame }) => iconFrame), expectedTrees[tree[0].tree]);
  });
  assert.equal(UPGRADE_ICON_FRAMES.ghost_friend, 24);
  assert.equal(UPGRADE_ICON_FRAMES.double_shot, 12);
  assert.notEqual(UPGRADE_ICON_FRAMES.ghost_friend, UPGRADE_ICON_FRAMES.double_shot);
  assert.ok(ALL_UPGRADES.every(({ iconFrame }) => Number.isInteger(iconFrame)));
});

test('uses the exact 48 normal upgrades and three boss-only Tomes', () => {
  assert.equal(UPGRADE_CHOICE_COUNT, 5);
  assert.equal(UPGRADE_TREES.length, 12);
  assert.equal(UPGRADES.length, 48);
  assert.equal(TOMES.length, 3);
  assert.equal(ALL_UPGRADES.length, 51);
  assert.ok(UPGRADE_TREES.every((tree) => tree.length === 4));
  assert.ok(UPGRADE_TREES.every((tree) => tree.map(({ tier }) => tier).join() === '1,2,2,3'));
  assert.ok(TOMES.every(({ type }) => type === 'tome'));
  assert.ok(eligibleUpgrades(new Set()).every(({ type }) => type === 'normal'));
});

test('upgrade eligibility follows root, either branch, then final tier', () => {
  const initial = eligibleUpgrades(new Set());
  assert.equal(initial.length, 12);
  assert.ok(initial.every(({ tier }) => tier === 1));
  const afterRoot = eligibleUpgrades(new Set(['double_shot']));
  assert.ok(afterRoot.some(({ id }) => id === 'fan_fire'));
  assert.ok(afterRoot.some(({ id }) => id === 'split_fire'));
  assert.ok(!afterRoot.some(({ id }) => id === 'fusillade'));
  const afterBranch = eligibleUpgrades(new Set(['double_shot', 'fan_fire']));
  assert.ok(afterBranch.some(({ id }) => id === 'split_fire'));
  assert.ok(afterBranch.some(({ id }) => id === 'fusillade'));
});

test('level choices sample five unique eligible cards without Tome leakage', () => {
  const cards = sampleUpgradeCards(new Set(), 5, () => .25);
  assert.equal(cards.length, 5);
  assert.equal(new Set(cards.map(({ id }) => id)).size, 5);
  assert.ok(cards.every(({ tier, type }) => tier === 1 && type === 'normal'));
});

test('spawn sessions preserve the authored ten-minute schedule', () => {
  assert.equal(SPAWN_SESSIONS.length, 9);
  assert.deepEqual(SPAWN_SESSIONS[0], {
    id: 'tentacle-0', enemyId: 'tentacle', from: 0, to: 60, hp: 24,
    maxAlive: 20, count: 4, interval: 3,
  });
  assert.deepEqual(SPAWN_SESSIONS.at(-1), {
    id: 'tentacle-final', enemyId: 'tentacle', from: 480, to: 600, hp: 100,
    maxAlive: 600, count: 16, interval: 1,
  });
  assert.equal(TEN_MINUTES_BALANCE.enemy.shub.chargeRatio, 2.6);
  assert.deepEqual(TEN_MINUTES_BALANCE.enemy.lateRun, { startsAt: 480, extraEquivalentHits: 1 });
});

test('contact enemies remain kiteable while the player is firing', () => {
  const firingSpeed = TEN_MINUTES_BALANCE.player.baseRunSpeed
    * TEN_MINUTES_BALANCE.player.shootWalkRatio;
  ['tentacle', 'boomer', 'elder', 'shub'].forEach((id) => {
    const definition = ENEMIES[id] || BOSSES[id];
    assert.ok(definition.speed < firingSpeed, `${id} pursuit speed must stay below firing movement`);
  });
  assert.ok(ENEMIES.eye.speed < firingSpeed);
  assert.ok(TEN_MINUTES_BALANCE.enemy.shub.chargeRatio > 2,
    'the telegraphed boss charge remains the intentional speed threat');
});

test('content mappings use only the approved enemies and bosses', () => {
  assert.deepEqual(Object.keys(ENEMY_ATLASES), Object.keys(ENEMIES));
  assert.deepEqual(Object.keys(BOSS_ATLASES), Object.keys(BOSSES));
  assert.match(STATIC_ASSETS.map, /night-soil-calm-v3-2k\.webp$/);
});
