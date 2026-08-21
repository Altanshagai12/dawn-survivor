import assert from 'node:assert/strict';
import test from 'node:test';
import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { RunState } from '../src/game/RunState.js';

const upgrade = (id) => UPGRADES.find((item) => item.id === id);

test('applies upgrades once and preserves health bounds', () => {
  const state = new RunState(HEROES.nyra, WEAPONS.revolver);
  assert.equal(state.applyUpgrade(upgrade('vitality-1')), true);
  assert.equal(state.maxHp, 5);
  assert.equal(state.hp, 5);
  assert.equal(state.applyUpgrade(upgrade('vitality-1')), false);
  state.heal(100);
  assert.equal(state.hp, 5);
});

test('experience can grant multiple queued levels', () => {
  const state = new RunState(HEROES.sola, WEAPONS.flame);
  assert.equal(state.gainXp(20), 2);
  assert.equal(state.level, 3);
  assert.equal(state.xp, 0);
});

test('shield blocks a hit and recharges on the simulation clock', () => {
  const state = new RunState(HEROES.kage, WEAPONS.smgs);
  state.applyUpgrade(upgrade('shield-1'));
  assert.deepEqual(state.takeDamage(1), { blocked: true, dead: false });
  assert.equal(state.hp, 3);
  state.tick(90);
  assert.equal(state.shieldReady, true);
});

test('last breath triggers only once', () => {
  const state = new RunState(HEROES.nyra, WEAPONS.shotgun);
  state.flags.lastBreath = true;
  assert.equal(state.takeDamage(9).dead, false);
  assert.equal(state.hp, 2);
  assert.equal(state.takeDamage(9).dead, true);
});

test('Varka gains permanent attack tempo when damaged', () => {
  const state = new RunState(HEROES.varka, WEAPONS.revolver);
  const before = state.fireDelayMs;
  state.takeDamage(1);
  assert.ok(state.fireDelayMs < before);
  assert.ok(state.reloadMs < WEAPONS.revolver.reload * 1000);
});
