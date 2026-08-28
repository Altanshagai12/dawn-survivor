import assert from 'node:assert/strict';
import test from 'node:test';
import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { ALL_UPGRADES } from '../src/data/upgrades.js';
import { RunState } from '../src/game/RunState.js';

const upgrade = (id) => ALL_UPGRADES.find((item) => item.id === id);

test('Vitality applies once and preserves health bounds', () => {
  const state = new RunState(HEROES.shana, WEAPONS.revolver);
  assert.equal(state.applyUpgrade(upgrade('vitality')), true);
  assert.equal(state.maxHp, 4);
  assert.equal(state.hp, 4);
  assert.equal(state.applyUpgrade(upgrade('vitality')), false);
  state.heal(100);
  assert.equal(state.hp, 4);
});

test('Tome of Rage triples base ammo rather than a modified fixed value', () => {
  const state = new RunState(HEROES.diamond, WEAPONS.revolver);
  state.applyUpgrade(upgrade('light_bullets'));
  state.applyUpgrade(upgrade('armed_and_ready'));
  state.applyUpgrade(upgrade('tome_of_rage'));
  assert.equal(state.magazine, WEAPONS.revolver.magazine * 3 + 3);
});

test('Tome of Power reduces Max HP and clamps current HP', () => {
  const state = new RunState(HEROES.shana, WEAPONS.crossbow);
  state.applyUpgrade(upgrade('tome_of_power'));
  assert.equal(state.maxHp, 2);
  assert.equal(state.hp, 2);
});

test('Big Shot visibly enlarges bullets by forty percent', () => {
  const state = new RunState(HEROES.shana, WEAPONS.revolver);
  state.applyUpgrade(upgrade('big_shot'));
  assert.equal(state.multiplierStats.bulletSize, 1.4);
  assert.equal(WEAPONS.revolver.bulletSize * state.multiplierStats.bulletSize, 11.2);
});

test('Holy Shield blocks one hit and follows 120/60 second recharge rules', () => {
  const state = new RunState(HEROES.hina, WEAPONS.crossbow);
  state.applyUpgrade(upgrade('holy_shield'));
  assert.deepEqual(state.takeDamage(1), { blocked: true, dead: false });
  assert.equal(state.hp, 2);
  state.tick(119.9);
  assert.equal(state.shieldReady, false);
  state.tick(.1);
  assert.equal(state.shieldReady, true);
  state.applyUpgrade(upgrade('stalwart_shield'));
  state.takeDamage(1);
  state.tick(60);
  assert.equal(state.shieldReady, true);
});

test('Anger Point is a temporary 15-second fire-rate buff', () => {
  const state = new RunState(HEROES.shana, WEAPONS.revolver);
  state.applyUpgrade(upgrade('anger_point'));
  const baseDelay = state.fireDelayMs;
  state.takeDamage(1);
  assert.ok(state.fireDelayMs < baseDelay);
  state.tick(15);
  assert.equal(state.fireDelayMs, baseDelay);
});

test('Regeneration heals one HP every 90 simulation seconds', () => {
  const state = new RunState(HEROES.diamond, WEAPONS.revolver);
  state.applyUpgrade(upgrade('regeneration'));
  state.hp = 3;
  state.tick(89.9);
  assert.equal(state.hp, 3);
  state.tick(.1);
  assert.equal(state.hp, 4);
});

test('RunState rejects direct damage while its i-frame state is active', () => {
  const state = new RunState(HEROES.shana, WEAPONS.revolver);
  state.isInvincible = true;
  assert.deepEqual(state.takeDamage(1), { blocked: true, dead: false, invulnerable: true });
  assert.equal(state.hp, state.maxHp);
});

test('experience can grant multiple queued levels', () => {
  const state = new RunState(HEROES.scarlett, WEAPONS.flame);
  assert.equal(state.gainXp(20), 2);
  assert.equal(state.level, 3);
});
