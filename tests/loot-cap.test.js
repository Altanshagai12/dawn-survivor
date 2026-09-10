import assert from 'node:assert/strict';
import test from 'node:test';
import { LootSystem } from '../src/game/LootSystem.js';
import { gameDeviceProfile } from '../src/game/deviceProfile.js';

function fixture(cap) {
  const children = [];
  const timers = [];
  const scene = {
    player: { x: 0, y: 0 }, performance: { gemCap: cap, lightScale: 1 },
    physics: { add: { overlap() {} }, moveToObject(gem) { gem.moving = true; } },
    chests: { getChildren: () => [] },
    state: { flags: {}, multiplierStats: { pickup: 1 }, gained: 0,
      gainXp(value) { this.gained += value; return 0; } },
    time: { delayedCall(_ms, callback) { timers.push(callback); } },
    gems: {
      countActive: () => children.length,
      getChildren: () => children,
      create(x, y) {
        assert.ok(children.length < cap, 'physical gem count must stay capped');
        const gem = { active: true, x, y, xpValue: 1, attracting: false,
          body: { setCircle() {} },
          setDepth() { return this; }, setScale(scale) { this.scale = scale; return this; },
          setVelocity(x, y) { this.velocity = [x, y]; return this; },
          destroy() { this.active = false; children.splice(children.indexOf(this), 1); },
        };
        children.push(gem);
        return gem;
      },
    },
  };
  return { scene, loot: new LootSystem(scene), children, timers };
}

function withPhaser(run) {
  const previous = globalThis.Phaser;
  globalThis.Phaser = { Math: { Between: () => 0,
    Distance: { Between: (x, y, px, py) => Math.hypot(x - px, y - py) } } };
  try { run(); } finally { globalThis.Phaser = previous; }
}

for (const profile of [{ coarse: true, cores: 4 }, { coarse: true, cores: 8 }, { width: 1280 }]) {
  const { gemCap } = gameDeviceProfile(profile);
  test(`saturated ${gemCap}-gem pool keeps drops local and conserves all XP`, () => withPhaser(() => {
    const { scene, loot, children } = fixture(gemCap);
    for (let i = 0; i < gemCap; i++) loot.dropGem(5000 + i * 10, 5000);
    for (let i = 0; i < 500; i++) {
      loot.dropGem(20, 0, 3);
      const fresh = children.find((gem) => gem.x === 20 && gem.y === 0);
      assert.ok(fresh, 'new kill must leave collectible XP at its own position');
      assert.equal(fresh.xpValue, 3, 'new drop must not teleport old remote XP to the player');
      assert.equal(children.length, gemCap);
      loot.update();
      assert.equal(fresh.attracting, true);
      loot.collectGem(fresh);
      loot.dropGem(6000 + i * 10, 5000);
    }
    assert.equal(scene.state.gained, 1500);
    assert.equal(children.reduce((sum, gem) => sum + gem.xpValue, 0), gemCap + 500);
    for (const gem of [...children]) loot.collectGem(gem);
    assert.equal(scene.state.gained, gemCap + 2000);
    assert.equal(children.length, 0);
  }));
}

test('consolidation leaves nearby and attracting gems alone when settled loot is available', () => withPhaser(() => {
  const { loot, children, timers } = fixture(4);
  loot.dropGem(10, 0, 2); loot.dropGem(1000, 0, 5);
  loot.dropGem(1010, 0, 7); loot.dropGem(5000, 0, 11);
  const flying = children[3]; flying.attracting = true;
  flying.setVelocity(17, 23);
  const donor = children[2]; const recipient = children[1];
  loot.dropGem(30, 0, 3);
  assert.equal(donor.active, false);
  assert.equal(recipient.xpValue, 12);
  assert.equal(recipient.x, 1000);
  assert.equal(flying.active, true);
  assert.equal(flying.xpValue, 11);
  assert.equal(flying.attracting, true);
  assert.equal(children[0].xpValue, 2);
  for (const callback of timers) callback();
  assert.deepEqual(flying.velocity, [17, 23], 'old timers must not stop attraction');
  assert.equal(children.reduce((sum, gem) => sum + gem.xpValue, 0), 28);
}));

test('one settled gem is not mixed into already-attracting loot', () => withPhaser(() => {
  const { loot, children } = fixture(4);
  loot.dropGem(9000, 0, 100);
  const settled = children[0];
  for (let i = 1; i < 4; i++) { loot.dropGem(i * 20, 0, 2); children[i].attracting = true; }
  loot.dropGem(300, 0, 1);
  assert.equal(settled.active, true);
  assert.equal(settled.xpValue, 100);
  assert.equal(settled.attracting, false);
  assert.equal(children.filter((gem) => gem.attracting).reduce((sum, gem) => sum + gem.xpValue, 0), 6);
  assert.equal(children.find((gem) => gem.x === 300).xpValue, 1);
}));

test('unexpected creation failure after compaction cannot discard XP', () => withPhaser(() => {
  const { scene, loot, children } = fixture(2);
  loot.dropGem(500, 0, 5); loot.dropGem(510, 0, 7);
  scene.gems.create = () => null;
  loot.dropGem(20, 0, 3);
  assert.equal(children.length, 1);
  assert.equal(children[0].xpValue, 15);
  assert.equal(scene.state.gained, 0);
}));

test('collecting consolidated loot queues every earned level exactly once', () => withPhaser(() => {
  const { scene, loot, children } = fixture(2);
  loot.dropGem(500, 0, 5); loot.dropGem(510, 0, 7);
  loot.dropGem(20, 0, 3);
  const queued = [];
  scene.state.gainXp = (xp) => { assert.equal(xp, 12); return 3; };
  scene.queueLevelUps = (count) => queued.push(count);
  const merged = children.find((gem) => gem.xpValue === 12);
  loot.collectGem(merged);
  loot.collectGem(merged);
  assert.deepEqual(queued, [3]);
}));

test('an all-attracting pool still leaves a new drop and preserves in-flight XP', () => withPhaser(() => {
  const { loot, children } = fixture(3);
  for (let i = 0; i < 3; i++) { loot.dropGem(50 + i * 5, 0, 2); children[i].attracting = true; }
  loot.dropGem(300, 0, 1);
  assert.equal(children.length, 3);
  assert.equal(children.filter((gem) => gem.attracting).length, 2);
  assert.equal(children.find((gem) => gem.x === 300).attracting, false);
  loot.update();
  assert.equal(children.find((gem) => gem.x === 300).attracting, false);
  assert.equal(children.reduce((sum, gem) => sum + gem.xpValue, 0), 7);
}));
