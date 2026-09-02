import assert from 'node:assert/strict';
import test from 'node:test';
import { DIRECTION_ROWS } from '../src/config/assets.js';
import { createDirectionalAnimations, removeDirectionalAnimations } from '../src/game/animations.js';

function animationScene() {
  const animations = new Map();
  let generation = 1;
  return {
    animations,
    reloadTexture() { generation += 1; },
    anims: {
      exists: (key) => animations.has(key),
      create: (animation) => animations.set(animation.key, animation),
      remove: (key) => animations.delete(key),
      generateFrameNumbers: (texture, { start, end }) => Array.from(
        { length: end - start + 1 }, (_, index) => ({ texture, frame: start + index, generation }),
      ),
    },
  };
}

test('replay recreates every skin animation with fresh atlas frame references', () => {
  const scene = animationScene();
  const skin = { key: 'premium-hero' };
  createDirectionalAnimations(scene, { key: 'base-hero' });
  const baseAnimations = [...scene.animations.values()];
  createDirectionalAnimations(scene, skin, 11);
  const originalFrames = DIRECTION_ROWS.map((direction) => scene.animations.get(`${skin.key}-${direction}`).frames);

  for (let run = 2; run <= 4; run += 1) {
    removeDirectionalAnimations(scene, skin);
    assert.deepEqual([...scene.animations.values()], baseAnimations);
    scene.reloadTexture();
    createDirectionalAnimations(scene, skin, 11);
    DIRECTION_ROWS.forEach((direction, row) => {
      const animation = scene.animations.get(`${skin.key}-${direction}`);
      assert.notEqual(animation.frames, originalFrames[row]);
      assert.equal(animation.frames.length, 6);
      assert.ok(animation.frames.every((frame) => frame.generation === run));
      assert.equal(animation.frameRate, 11);
      assert.equal(animation.repeat, -1);
    });
    baseAnimations.forEach((animation) => assert.equal(scene.animations.get(animation.key), animation));
  }
});

test('scene shutdown releases skin animations before unloading their texture', async () => {
  globalThis.Phaser = { Scene: class {} };
  const { GameScene } = await import('../src/game/GameScene.js');
  const scene = animationScene();
  const heroAtlas = { key: 'premium-hero' };
  createDirectionalAnimations(scene, heroAtlas);
  const removedTextures = [];
  Object.assign(scene, {
    state: { skin: { heroAtlas, vfxKey: 'premium-vfx' } },
    skinWeaponKey: 'premium-weapon',
    scale: { off() {} }, time: { paused: true }, ui: { hidePause() {} },
    textures: { remove(key) {
      assert.equal(scene.animations.size, 0, 'no animation may retain an unloaded Frame');
      removedTextures.push(key);
    } },
  });
  GameScene.prototype.cleanup.call(scene);
  assert.deepEqual(removedTextures, ['premium-vfx', 'premium-hero', 'premium-weapon']);
  assert.equal(scene.time.paused, false);
});
