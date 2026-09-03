import assert from 'node:assert/strict';
import test from 'node:test';
import { DIRECTION_ROWS, HERO_ATLASES, WEAPONLESS_HERO_ATLASES } from '../src/config/assets.js';
import { HEROES } from '../src/data/heroes.js';
import { PREMIUM_SKINS, skinProjectileAnchor, skinProjectileRotation } from '../src/data/skins.js';
import { WEAPONS } from '../src/data/weapons.js';
import { RunState } from '../src/game/RunState.js';
import { PLAYER_DISPLAY_HEIGHT, playerHitboxGeometry } from '../src/game/PlayerHitbox.js';
import { PremiumVfxDirector, premiumProjectileScale, premiumProjectileCoreScale } from '../src/game/PremiumVfxDirector.js';
import { restorePlayerTint, syncWeaponSkin } from '../src/game/SkinPresentation.js';

globalThis.Phaser = {
  Scene: class {}, BlendModes: { ADD: 1 },
  Math: { Linear: (from, to, amount) => from + (to - from) * amount },
};
globalThis.matchMedia = () => ({ matches: false });
if (!globalThis.navigator) globalThis.navigator = { hardwareConcurrency: 8 };
const { GameScene } = await import('../src/game/GameScene.js');

function node(x = 0, y = 0, key = '', frame = 0, width = 256, height = 256) {
  return {
    active: true, alpha: 1, x, y, texture: { key }, frame: { name: frame }, scaleX: 1, scaleY: 1,
    width, height, tint: null,
    get displayWidth() { return this.width * this.scaleX; },
    get displayHeight() { return this.height * this.scaleY; },
    setTexture(texture, name) { this.texture = { key: texture }; this.frame = { name }; return this; },
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    setScale(sx, sy = sx) { this.scaleX = sx; this.scaleY = sy; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setOrigin(ox, oy = ox) { this.originX = ox; this.originY = oy; return this; },
    setVisible(value) { this.visible = value; return this; },
    setFlipY(value) { this.flipY = value; return this; },
    setBlendMode() { return this; }, setDisplaySize() { return this; },
    setStrokeStyle() { return this; }, once() { return this; },
    clearTint() { this.tint = null; return this; },
    destroy() { this.active = false; },
    body: {
      setSize(width, height) { this.width = width; this.height = height; return this; },
      setOffset(x, y) { this.offsetX = x; this.offsetY = y; return this; },
      setMaxVelocity() { return this; },
    },
  };
}

function playerScene(state, zoom) {
  const images = [];
  const animations = new Map();
  const atlas = HERO_ATLASES[state.hero.id];
  return {
    state, images, animations, facing: { x: -1, y: 0 },
    anims: {
      exists: (key) => animations.has(key),
      create: (animation) => animations.set(animation.key, animation),
      generateFrameNumbers: (key, { start, end }) => Array.from(
        { length: end - start + 1 }, (_, offset) => ({ key, frame: start + offset }),
      ),
    },
    performance: { cameraZoom: zoom, lightScale: .9 },
    skinWeaponKey: state.skin ? `skin-weapon-${state.skin.id}-${state.weapon.id}` : null,
    physics: { add: { sprite: (x, y, key, frame) => node(x, y, key, frame, atlas.frameWidth, atlas.frameHeight) } },
    add: {
      image(x, y, key, frame) { const image = node(x, y, key, frame); images.push(image); return image; },
      rectangle: (...args) => node(...args), container: (...args) => node(...args),
    },
    cameras: { main: { startFollow() {}, setZoom() {} } },
  };
}

function bodyGeometry(scene) {
  const { player } = scene;
  return {
    tint: player.tint,
    width: player.displayWidth, height: player.displayHeight,
    scaleX: player.scaleX, scaleY: player.scaleY,
    bodyWidth: player.body.width * player.scaleX,
    bodyHeight: player.body.height * player.scaleY,
    bodyOffsetX: player.body.offsetX, bodyOffsetY: player.body.offsetY,
  };
}

test('every weapon skin loads the original weaponless body instead of a premium body', () => {
  const worldReady = new Error('state initialized');
  for (const hero of Object.values(HEROES)) for (const weapon of Object.values(WEAPONS)) {
    for (const skin of Object.values(PREMIUM_SKINS)) {
      const loaded = [];
      const scene = {
        textures: { exists: () => false },
        load: {
          spritesheet: (...args) => loaded.push(['spritesheet', ...args]),
          image: (...args) => loaded.push(['image', ...args]),
        },
        game: { registry: { get: () => ({}) } }, scale: { width: 900 },
        createWorld() { throw worldReady; },
      };
      GameScene.prototype.init.call(scene, { heroId: hero.id, weaponId: weapon.id, skinId: skin.id });
      GameScene.prototype.preload.call(scene);
      const atlas = WEAPONLESS_HERO_ATLASES[hero.id];
      assert.deepEqual(loaded, [
        ['spritesheet', skin.vfxKey, skin.vfxAtlas, { frameWidth: 256, frameHeight: 256 }],
        ['spritesheet', atlas.key, atlas.file, { frameWidth: atlas.frameWidth, frameHeight: atlas.frameHeight }],
        ['image', `skin-weapon-${skin.id}-${weapon.id}`, skin.weaponArt[weapon.id]],
      ]);
      assert.throws(() => GameScene.prototype.create.call(scene), (error) => error === worldReady);
      assert.equal(scene.state.skin.id, skin.id);
      assert.equal(scene.state.hero.id, hero.id);
      assert.equal(scene.state.weapon.id, weapon.id);
      assert.deepEqual(scene.state.multiplierStats, new RunState(hero, weapon).multiplierStats);
    }
  }
});

test('unknown and inherited skin IDs cannot load assets and init clears prior weapon keys', () => {
  for (const skinId of [null, 'fake-skin', 'toString', '__proto__']) {
    const scene = { skinWeaponKey: 'previous-run-weapon' };
    GameScene.prototype.init.call(scene, { heroId: 'shana', weaponId: 'revolver', skinId });
    GameScene.prototype.preload.call(scene);
    assert.equal(scene.skinWeaponKey, null);
    assert.equal(scene.weaponlessHeroAtlas, null);
  }
});

test('all hero bodies, sizes, hitboxes and upgrades remain original for every weapon skin', () => {
  for (const hero of Object.values(HEROES)) for (const weapon of Object.values(WEAPONS)) {
    for (const zoom of [.82, 1.05]) {
      const base = playerScene(new RunState(hero, weapon), zoom);
      GameScene.prototype.createPlayer.call(base);
      assert.equal(base.player.texture.key, HERO_ATLASES[hero.id].key);
      assert.equal(base.weaponSkin, null, 'original baked gun must not receive a second gun');
      assert.equal(base.animations.size, 0, 'original animations remain BootScene-owned');
      for (const skin of Object.values(PREMIUM_SKINS)) {
        const scene = playerScene(new RunState(hero, weapon, skin), zoom);
        GameScene.prototype.createPlayer.call(scene);
        assert.deepEqual(bodyGeometry(scene), bodyGeometry(base), `${hero.id}/${weapon.id}/${skin.id}/${zoom}`);
        const atlas = WEAPONLESS_HERO_ATLASES[hero.id];
        assert.equal(scene.player.texture.key, atlas.key);
        assert.equal(scene.playerAtlas.weaponless, true, 'skin guns require a body with no baked gun');
        assert.equal(scene.animations.size, 8);
        DIRECTION_ROWS.forEach((direction, row) => {
          const animation = scene.animations.get(`${atlas.key}-${direction}`);
          assert.equal(animation.frameRate, 11);
          assert.deepEqual(animation.frames.map(({ frame }) => frame), Array.from({ length: 6 }, (_, index) => row * 6 + index));
        });
        assert.ok(Math.abs(scene.player.displayHeight - PLAYER_DISPLAY_HEIGHT) < 1e-9);
        const body = bodyGeometry(scene);
        syncWeaponSkin(scene.weaponSkin, scene.player, 1);
        assert.deepEqual(bodyGeometry(scene), body, 'weapon animation must not mutate the hero');
        assert.equal(scene.images.filter(({ texture }) => texture.key.startsWith('skin-')).length, 1);
        scene.state.mods.playerSizeMul = .5;
        GameScene.prototype.applyPlayerSize.call(scene);
        const geometry = playerHitboxGeometry(PLAYER_DISPLAY_HEIGHT, 1.5);
        assert.ok(Math.abs(scene.player.displayHeight - PLAYER_DISPLAY_HEIGHT * 1.5) < 1e-9);
        assert.ok(Math.abs(scene.player.body.width * scene.player.scaleX - geometry.width) < 1e-9);
        assert.ok(Math.abs(scene.player.body.height * scene.player.scaleY - geometry.height) < 1e-9);
        scene.player.tint = 0xffffff;
        restorePlayerTint(scene);
        assert.equal(scene.player.tint, null);
      }
    }
  }
});

test('weapon skins retain projectile, muzzle, impact, trail and reload VFX without body effects', () => {
  for (const skin of Object.values(PREMIUM_SKINS)) for (const weapon of Object.values(WEAPONS)) {
    const state = new RunState(HEROES.shana, weapon, skin);
    const images = [];
    const scene = {
      state, player: { x: 0, y: 0, active: true }, time: { now: 1000 },
      performance: { premiumVfxCap: 34 },
      add: { image(...args) { const image = node(...args); images.push(image); return image; } },
    };
    const director = new PremiumVfxDirector(scene, skin);
    director.update(1, { moveX: 1, moveY: 0 });
    assert.equal(images.length, 0, 'movement/idle may not create body aura, motes or trails');
    const bullet = Object.assign(node(), { skin, weaponId: weapon.id, damage: 17, trajectoryAngle: .47 });
    director.styleProjectile(bullet, weapon.bulletSize, weapon.id);
    assert.equal(bullet.texture.key, skin.vfxKey);
    assert.equal(bullet.scaleX, premiumProjectileCoreScale(weapon.bulletSize, weapon.id, skin));
    assert.equal(bullet.premiumAuraScale, premiumProjectileScale(weapon.bulletSize, weapon.id, skin));
    const aura = director.active.find((entry) => entry.follow === bullet);
    assert.equal(aura.node.scaleX, bullet.premiumAuraScale);
    assert.ok(aura.node.alpha < .5, 'cosmetic outer energy stays softer than the opaque hit core');
    assert.equal(bullet.rotation, .47 + skinProjectileRotation(skin, weapon.id));
    assert.equal(bullet.originX, skinProjectileAnchor(skin, weapon.id).x);
    assert.equal(bullet.damage, 17);
    director.shot(.47);
    assert.ok(director.active.length >= 2, 'muzzle and tracer are preserved');
    const muzzle = director.active.find(({ priority }) => priority === 3);
    const tightRadius = weapon.bulletSize / 2;
    assert.equal(muzzle.startScaleX, ((weapon.id === 'shotgun' ? .09 : .15) * 1.12 + tightRadius / 80) / 2);
    assert.equal(muzzle.endScaleX, (.28 * 1.12 + tightRadius / 56) / 2);
    let count = director.active.length;
    director.trail(bullet);
    assert.ok(director.active.length > count);
    count = director.active.length;
    director.impact(bullet, 25, 30);
    assert.ok(director.active.length > count);
    assert.equal(director.active[count].startScaleX, (.1 * 1.12 + tightRadius / 80) / 2);
    assert.equal(director.active[count].endScaleX, (.3 * 1.12 + tightRadius / 48) / 2);
    count = director.active.length;
    director.reload('start');
    director.reload('complete');
    assert.equal(director.active.length, count + 2);
    assert.ok(images.every(({ texture }) => texture.key === skin.vfxKey));
    bullet.active = false;
    director.update(1);
    assert.equal(director.active.length, 0);
    assert.ok(images.every(({ visible }) => !visible));
    director.destroy();
    assert.ok(images.every(({ active }) => !active));
  }
});
