import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO_ATLASES } from '../src/config/assets.js';
import { HEROES } from '../src/data/heroes.js';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { skinProjectileEnvelope } from '../src/data/skinProjectileBounds.js';
import { WEAPONS } from '../src/data/weapons.js';
import { CombatSystem } from '../src/game/CombatSystem.js';
import { PremiumVfxDirector } from '../src/game/PremiumVfxDirector.js';
import { RunState } from '../src/game/RunState.js';
import { applyWeaponSkin } from '../src/game/SkinPresentation.js';
import { directionalPose } from '../src/game/animations.js';

globalThis.Phaser = {
  BlendModes: { ADD: 1, NORMAL: 0 },
  Math: {
    DegToRad: (value) => value * Math.PI / 180, FloatBetween: () => .25,
    Linear: (from, to, progress) => from + (to - from) * progress,
    Distance: { Between: (x, y, tx, ty) => Math.hypot(tx - x, ty - y) },
    Angle: {
      Between: (x, y, tx, ty) => Math.atan2(ty - y, tx - x),
      Wrap: (angle) => Math.atan2(Math.sin(angle), Math.cos(angle)),
    },
  },
};

const TEXTURE_SIZES = {
  bullet: [8, 8], 'bullet-revolver': [36, 14], 'bullet-pellet': [20, 10],
  'bullet-bolt': [64, 10], 'bullet-flame': [44, 22], 'bullet-spirit': [28, 14],
};
const rounded = (value) => Math.round(value * 1e8) / 1e8;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

function node(x = 0, y = 0, key = 'bullet', width, height) {
  const result = {
    x, y, active: true, scaleX: 1, scaleY: 1, originX: .5, originY: .5, rotation: 0,
    setTexture(key, name = 0) {
      const size = TEXTURE_SIZES[key] || [256, 256];
      this.width = size[0]; this.height = size[1]; this.texture = { key };
      this.frame = { name, width: size[0], height: size[1], realWidth: size[0], realHeight: size[1] };
      return this;
    },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setFlipY(value) { this.flipY = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setTint() { return this; }, setBlendMode() { return this; }, once() { return this; },
    destroy() { this.active = false; },
    get displayHeight() { return this.height * this.scaleY; },
    body: {
      velocity: { x: 0, y: 0 }, radius: 0, offsetX: 0, offsetY: 0,
      setCircle(radius, x, y) { this.radius = radius; this.offsetX = x; this.offsetY = y; },
    },
  };
  result.setTexture(key);
  if (width) { result.width = width; result.height = height; }
  return result;
}

function sceneFor(heroId, weaponId, skin, angle, mode = 'normal') {
  const atlas = HERO_ATLASES[heroId], direction = directionalPose(Math.cos(angle), Math.sin(angle), true);
  const player = node(71, -113, atlas.key, atlas.frameWidth, atlas.frameHeight);
  player.setScale(78 / atlas.frameHeight * (mode === 'normal' ? 1 : 1.5));
  player.frame.name = direction.frameRow * 6 + 3; player.flipX = direction.flipX; player.rotation = .037;
  const state = new RunState(HEROES[heroId], WEAPONS[weaponId], skin);
  state.ammo = 100; state.weaponCharge = .65;
  const created = [], enemies = [];
  const scene = {
    state, player, created, targets: enemies, time: { now: 5000 },
    facing: { x: Math.cos(angle), y: Math.sin(angle) }, skinWeaponKey: skin && 'held-weapon',
    performance: { premiumVfxCap: 96, vfxCap: 100 },
    add: { image: node, rectangle: node, circle: node, ellipse: node },
    tweens: { add() {} }, onShot() {}, flashEffect() {},
    enemies: { getChildren: () => enemies },
    bullets: {
      create(x, y, key) { const bullet = node(x, y, key); created.push(bullet); return bullet; },
      getChildren: () => created,
    },
    physics: {
      add: { overlap() {} },
      velocityFromRotation(angle, speed, velocity) {
        velocity.x = Math.cos(angle) * speed; velocity.y = Math.sin(angle) * speed;
      },
    },
  };
  if (mode !== 'normal') {
    state.mods = { damageMul: .4, bulletSizeMul: .4, projectileSpeedMul: .2, projectilesAdd: 1,
      spreadAdd: 4, pierceAdd: 1, knockbackMul: .25 };
    state.flags = { backShot: true, magicLens: true, lensDouble: true, lensBurn: true, lensBounceAdd: 1 };
    state.owned = new Set(['power_shot', 'big_shot', 'double_shot', 'fusillade', 'magic_lens']);
    scene.magicLens = { active: true, x: player.x + Math.cos(angle) * 80, y: player.y + Math.sin(angle) * 80 };
  }
  if (mode === 'final-shot') {
    state.flags.fanFire = true; state.flags.iceShard = true; state.flags.fireballCadence = 1;
    state.ammo = 1; state.shots = 2;
  }
  scene.weaponSkin = applyWeaponSkin(scene);
  // This is deliberately the real director: setTexture changes the bullet frame to 256x256.
  // A no-op styleProjectile mock would hide render-derived collision regressions.
  scene.premiumVfx = new PremiumVfxDirector(scene, skin);
  scene.combat = new CombatSystem(scene);
  return scene;
}

function physicsSnapshot(bullet) {
  const fields = ['x', 'y', 'damage', 'speed', 'expiresAt', 'trajectoryAngle', 'pierce', 'bounces',
    'knockback', 'burnChance', 'burnDps', 'freezeChance', 'curseChance', 'collisionRadius',
    'explosionDamage', 'fireball', 'summon', 'sourceType', 'weaponId', 'sweptCollision', 'active'];
  const snapshot = Object.fromEntries(fields.map((key) => [key, typeof bullet[key] === 'number' ? rounded(bullet[key]) : bullet[key]]));
  snapshot.velocity = [bullet.body.velocity.x, bullet.body.velocity.y].map(rounded);
  snapshot.actualWorldRadius = rounded(bullet.body.radius * Math.abs(bullet.scaleX));
  snapshot.center = [
    bullet.x + (bullet.body.offsetX + bullet.body.radius - bullet.width * bullet.originX) * bullet.scaleX,
    bullet.y + (bullet.body.offsetY + bullet.body.radius - bullet.height * bullet.originY) * bullet.scaleY,
  ].map(rounded);
  return snapshot;
}

function fire(scene, angle) {
  scene.combat.fire(Math.cos(angle), Math.sin(angle));
  return { bullets: scene.created.map(physicsSnapshot), ammo: scene.state.ammo, shots: scene.state.shots,
    reloading: scene.state.reloading, nextShotAt: scene.combat.nextShotAt };
}

test('real spawned skin bullets match original physics across every hero, gun, direction and upgrade path', () => {
  for (const heroId of Object.keys(HEROES)) for (const weaponId of Object.keys(WEAPONS)) {
    for (let direction = 0; direction < 8; direction++) for (const mode of ['normal', 'upgraded', 'final-shot']) {
      const angle = direction * Math.PI / 4 + .13;
      const original = fire(sceneFor(heroId, weaponId, null, angle, mode), angle);
      for (const skin of Object.values(PREMIUM_SKINS)) {
        const scene = sceneFor(heroId, weaponId, skin, angle, mode);
        assert.deepEqual(fire(scene, angle), original, `${heroId}/${weaponId}/${skin.id}/${direction}/${mode}`);
        for (const bullet of scene.created) {
          near(bullet.body.radius * bullet.scaleX, bullet.collisionRadius);
          assert.equal(bullet.texture.key, skin.vfxKey, 'test must execute real premium texture replacement');
          near(skinProjectileEnvelope(bullet.skin, bullet.weaponId) * bullet.scaleX, bullet.collisionRadius);
        }
      }
    }
  }
});

test('original authored radii and origin distances remain the authority, independent of cosmetics', () => {
  for (const weapon of Object.values(WEAPONS)) for (const skin of [null, ...Object.values(PREMIUM_SKINS)]) {
    for (const mode of ['normal', 'upgraded']) {
      const scene = sceneFor('hina', weapon.id, skin, -.83, mode);
      fire(scene, -.83);
      const expectedRadius = weapon.bulletSize * (mode === 'normal' ? 1 : 1.4) / 2;
      for (const bullet of scene.created) {
        near(bullet.collisionRadius, expectedRadius);
        near(bullet.body.radius * bullet.scaleX, expectedRadius);
        near(Math.hypot(bullet.x - scene.player.x, bullet.y - scene.player.y), bullet.sourceType === 'rear' ? 22 : 26);
        near(bullet.expiresAt - scene.time.now, weapon.projectileLife * 1000);
      }
    }
  }
});

test('explicitly unskinned and weaponless summon bullets cannot inherit premium gameplay or texture scaling', () => {
  for (const weapon of Object.values(WEAPONS)) {
    const cases = [
      { weaponId: weapon.id, texture: weapon.projectileTexture, skin: null },
      { summon: true, texture: 'bullet-spirit', sourceType: 'summon' },
      { weaponId: weapon.id, texture: weapon.projectileTexture, sourceType: 'splinter', size: 5 },
    ];
    for (const variant of cases) {
      const spec = { damage: 3, speed: 430, life: .55, size: 7, ...variant };
      const base = sceneFor('hina', weapon.id, null, .7);
      const original = base.combat.spawnBullet(55, -81, .7, spec);
      for (const skin of Object.values(PREMIUM_SKINS)) {
        const scene = sceneFor('hina', weapon.id, skin, .7);
        const actual = scene.combat.spawnBullet(55, -81, .7, spec);
        assert.deepEqual(physicsSnapshot(actual), physicsSnapshot(original), `${skin.id}/${weapon.id}/${variant.sourceType}`);
        near(actual.collisionRadius, spec.size / 2);
        if (!variant.weaponId || variant.skin === null) {
          assert.equal(actual.texture.key, variant.texture);
          near(actual.scaleX, original.scaleX);
          scene.premiumVfx.trail(actual);
          assert.equal(scene.premiumVfx.active.length, 0, 'unskinned bullets must not create a premium trail');
        } else assert.equal(actual.texture.key, skin.vfxKey);
      }
    }
  }
});

test('a null-skin director leaves base shots, textures and trails alone without errors', () => {
  for (const weapon of Object.values(WEAPONS)) {
    const scene = sceneFor('shana', weapon.id, null, .61);
    fire(scene, .61);
    const before = scene.created.map(physicsSnapshot);
    scene.premiumVfx.shot(.61, scene.created.map(({ trajectoryAngle }) => trajectoryAngle));
    for (const bullet of scene.created) scene.premiumVfx.trail(bullet);
    scene.premiumVfx.update(.1);
    assert.deepEqual(scene.created.map(physicsSnapshot), before);
    assert.equal(scene.premiumVfx.active.length, 0);
    assert.equal(scene.premiumVfx.pool.length, 0);
    assert.ok(scene.created.every(({ texture }) => texture.key === weapon.projectileTexture));
  }
});

function collisionRun(heroId, weapon, skin, angle, upgraded) {
  const scene = sceneFor(heroId, weapon.id, skin, angle, upgraded ? 'upgraded' : 'normal');
  // Isolate the real launch/travel collision from optional ricochet and random statuses.
  scene.state.flags = {}; scene.state.mods = {};
  const size = weapon.bulletSize * (upgraded ? 1.4 : 1), radius = size / 2;
  const speed = weapon.projectileSpeed * (upgraded ? 1.2 : 1), range = speed * weapon.projectileLife;
  const targetRadius = 5;
  function target(id, forward, side) {
    const value = node(scene.player.x + Math.cos(angle) * forward - Math.sin(angle) * side,
      scene.player.y + Math.sin(angle) * forward + Math.cos(angle) * side);
    delete value.body;
    Object.assign(value, { spawnId: id, hp: 10000, maxHp: 10000,
      enemyDef: { radius: targetRadius }, status: { burnUntil: 0, freezeUntil: 0 } });
    scene.targets.push(value);
  }
  target('near', 12, 0);
  target('edge-hit', 70, targetRadius + radius - .001);
  target('edge-miss', 110, targetRadius + radius + .001);
  target('range-hit', 26 + range - 1, 0);
  target('beyond-range', 26 + range + targetRadius + radius + .01, 0);
  const bullet = scene.combat.spawnBullet(scene.player.x + Math.cos(angle) * 26,
    scene.player.y + Math.sin(angle) * 26, angle, {
      weaponId: weapon.id, texture: weapon.projectileTexture, size, speed, life: weapon.projectileLife,
      damage: weapon.damage, pierce: 20, launchOrigin: { x: scene.player.x, y: scene.player.y },
    });
  const nearHp = scene.targets[0].hp;
  bullet.x += bullet.body.velocity.x * weapon.projectileLife;
  bullet.y += bullet.body.velocity.y * weapon.projectileLife;
  scene.time.now = bullet.expiresAt;
  scene.combat.update(0, { firing: false });
  return { nearHp, hp: scene.targets.map(({ spawnId, hp }) => [spawnId, hp]), active: bullet.active };
}

test('real launch and travel sweeps have identical close, edge, miss and maximum-range outcomes', () => {
  for (const heroId of Object.keys(HEROES)) for (const weapon of Object.values(WEAPONS)) {
    for (const angle of [-2.4, -.17, 1.8]) for (const upgraded of [false, true]) {
      const original = collisionRun(heroId, weapon, null, angle, upgraded);
      assert.equal(original.nearHp, 10000 - weapon.damage, 'near target must be hit during launch sweep');
      assert.deepEqual(original.hp.map(([, hp]) => hp < 10000), [true, true, false, true, false]);
      assert.equal(original.active, false, 'bullet must expire at the same authored lifetime');
      for (const skin of Object.values(PREMIUM_SKINS)) {
        assert.deepEqual(collisionRun(heroId, weapon, skin, angle, upgraded), original,
          `${heroId}/${weapon.id}/${skin.id}/${angle}/${upgraded}`);
      }
    }
  }
});
