import test from 'node:test';
import assert from 'node:assert/strict';
import { SummonSystem } from '../src/game/SummonSystem.js';
import { presentWeaponImpact, updateProjectilePresentation } from '../src/game/WeaponPresentation.js';

globalThis.Phaser = {
  BlendModes: { ADD: 1 },
  Math: { Angle: { Between: (x,y,tx,ty) => Math.atan2(ty-y,tx-x) },
    Distance: { Between: (x,y,tx,ty) => Math.hypot(tx-x,ty-y) } },
};

function fixture(weaponId = 'flame', skin = { primary: 0xff0000 }) {
  const images = [], shots = [], effects = [];
  const object = (kind, x, y, texture) => {
    const node = { kind, x, y, texture, active: true,
      setPosition(x,y) { this.x=x; this.y=y; return this; },
      setScale() { return this; }, setVisible() { return this; }, setDepth() { return this; },
      setRotation() { return this; }, setBlendMode() { return this; }, setStrokeStyle() { return this; },
      setFlipX() { return this; }, once() {}, destroy() { this.active=false; } };
    (kind === 'image' ? images : effects).push(node); return node;
  };
  const target = { x: 260, y: 20, active: true };
  const scene = {
    player: {x: 100,y: 100}, time: {now:1000}, textures: {exists: () => true},
    state: { flags: {ghostFriend: true,magicDagger: true,magicScythe: true,electroBug:true,daggerCount:2},
      elapsed: 1, skin, weapon: {id:weaponId,damage:12},
      multiplierStats: {summonRate:1,summonDamage:1.5,damage:2} },
    add: Object.fromEntries(['image','circle','ellipse','rectangle'].map(kind => [kind,(...args)=>object(kind,...args)])),
    tweens: { add() {} }, nearestEnemy: () => target,
    enemies: {getChildren: () => []},
    combat: {spawnBullet(x,y,angle,spec) { const bullet={x,y,angle,...spec}; shots.push(bullet); return bullet; },
      effects: {lightning() {}}},
    premiumVfx: {trail() { throw Error('Weapon skin must not replace summon trails'); },
      impact() { throw Error('Weapon skin must not replace summon impacts'); }},
  };
  return { scene, images, shots, effects, target };
}

test('world summons have dedicated silhouettes; ghost and homing daggers keep their existing combat values', () => {
  for (const weaponId of ['revolver','shotgun','crossbow','flame']) {
    for (const skin of [null,{primary:0xff0000}]) {
      const {scene,images,shots,target} = fixture(weaponId,skin);
      const system = new SummonSystem(scene);
      system.update(.8);
      assert.deepEqual(images.map(node=>node.texture),
        ['summon-ghost','summon-dagger','summon-dagger','summon-scythe','summon-bug']);
      assert.equal(shots.length,3);
      assert.equal(shots[0].texture,'summon-ghost-shot');
      assert.equal(shots[0].damage,33);
      assert.equal(shots[1].texture,'summon-dagger-shot');
      assert.equal(shots[1].damage,36);
      assert.equal(shots[1].homingTarget,target);
      for (const bullet of shots) {
        assert.equal(bullet.speed,470); assert.equal(bullet.life,1.2);
        assert.equal(bullet.size,8); assert.equal(bullet.pierce,1);
        assert.equal(bullet.weaponId,weaponId); assert.equal(bullet.skin,null);
        assert.equal(bullet.summon,true); assert.equal(bullet.sourceType,'summon');
      }
      system.destroy(); assert.ok(images.every(image=>!image.active));
    }
  }
});

test('ghost has a dissipating spirit impact and dagger has sharp sparks even when a flame gun is equipped', () => {
  for (const summonKind of ['ghost','dagger']) {
    const {scene,effects} = fixture();
    const bullet = {x:200,y:100,weaponId:'flame',summonKind,rotation:0};
    presentWeaponImpact(scene,bullet,200,100);
    const impactKinds = effects.map(effect=>effect.kind);
    assert.equal(impactKinds.includes('circle'),summonKind==='ghost');
    effects.length=0;
    updateProjectilePresentation(scene,bullet);
    assert.deepEqual(effects.map(effect=>effect.kind),[summonKind==='ghost'?'ellipse':'rectangle']);
  }
});
