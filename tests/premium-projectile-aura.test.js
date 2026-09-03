import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { PremiumVfxDirector } from '../src/game/PremiumVfxDirector.js';

globalThis.Phaser = { BlendModes: { ADD: 1 }, Math: { Linear: (a, b, t) => a + (b - a) * t } };

function image(x = 0, y = 0) {
  return Object.assign(new EventEmitter(), {
    x, y, active: true, visible: true, alpha: 1,
    setTexture(key, frame) { this.texture = { key }; this.frame = frame; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setRotation(angle) { this.rotation = angle; return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setBlendMode() { return this; },
    destroy() { this.active = false; this.emit('destroy'); },
  });
}

function fixture(cap = 4) {
  const skin = Object.values(PREMIUM_SKINS)[0];
  const scene = { state: { owned: new Set() }, add: { image }, performance: { premiumVfxCap: cap } };
  const director = new PremiumVfxDirector(scene, skin);
  const shot = () => {
    const bullet = Object.assign(image(40, -30), { skin, weaponId: 'shotgun', trajectoryAngle: .37 });
    director.styleProjectile(bullet, 6, 'shotgun');
    return bullet;
  };
  return { director, shot };
}

test('soft aura follows the actual projectile center and corrected homing/ricochet rotation', () => {
  const { director, shot } = fixture();
  const bullet = shot(), aura = director.active[0];
  assert.equal(aura.follow, bullet);
  assert.equal(aura.node.scaleX, bullet.premiumAuraScale);
  assert.ok(aura.node.alpha < bullet.alpha / 2);
  assert.equal(aura.node.originX, bullet.originX);
  assert.equal(aura.node.originY, bullet.originY);
  bullet.setPosition(-88, 42).setRotation(-1.1);
  director.update(.2);
  director.syncFollowers();
  assert.deepEqual([aura.node.x, aura.node.y, aura.node.rotation], [-88, 42, -1.1]);
  assert.equal(aura.node.scaleX, bullet.premiumAuraScale, 'midpoint silhouette does not inflate over its lifetime');
  bullet.destroy();
  assert.equal(aura.node.visible, false, 'impact/expiry hides attached energy immediately');
  director.update(.01);
  assert.equal(director.active.length, 0);
});

test('followers sync after physics writes the final sprite position and detach on scene teardown', () => {
  const skin = Object.values(PREMIUM_SKINS)[0], callbacks = new Map();
  const scene = {
    state: {}, add: { image },
    events: {
      on(event, callback, context) { callbacks.set(event, { callback, context }); },
      off(event, callback, context) {
        assert.deepEqual(callbacks.get(event), { callback, context }); callbacks.delete(event);
      },
    },
  };
  const director = new PremiumVfxDirector(scene, skin);
  const bullet = Object.assign(image(), { skin, weaponId: 'crossbow', trajectoryAngle: 0 });
  director.styleProjectile(bullet, 9, 'crossbow');
  director.update(1 / 60);
  bullet.x += 900 / 60; // Arcade world's postUpdate, after Scene.update.
  const { callback, context } = callbacks.get('postupdate');
  callback.call(context);
  assert.equal(director.active[0].node.x, bullet.x, 'no one-frame offset at render time');
  director.destroy();
  assert.equal(callbacks.size, 0);
});

test('pool exhaustion may drop ornamentation but never drops the opaque projectile or changes its scale', () => {
  const { director, shot } = fixture(1);
  const first = shot(), second = shot();
  assert.equal(director.pool.length, 1);
  assert.ok(second.active);
  assert.equal(second.scaleX, first.scaleX);
  assert.equal(second.texture.key, first.texture.key);
  first.destroy();
  const third = shot(), recycled = director.active.find(({ active }) => active);
  assert.equal(recycled.follow, third);
  second.destroy();
  assert.equal(recycled.active, true, 'another bullet cannot release this owner');
  director.destroy();
  assert.equal(recycled.node.active, false);
  assert.equal(director.pool.length, 0);
  assert.equal(recycled.follow, null, 'teardown clears callbacks before scene-owned bullets are destroyed');
  third.destroy();
});

test('destroying an evicted aura owner cannot hide the effect which reused its pooled node', () => {
  const { director, shot } = fixture(1);
  const oldOwner = shot();
  const flash = director.emit(7, 50, 60, { priority: 3, duration: 100 });
  assert.ok(flash?.visible);
  oldOwner.destroy();
  assert.equal(flash.visible, true);
  director.update(.2);
  assert.equal(flash.visible, false);
});
