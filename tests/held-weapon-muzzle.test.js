import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { HERO_ATLASES } from '../src/config/assets.js';
import { HEROES } from '../src/data/heroes.js';
import { PREMIUM_SKINS } from '../src/data/skins.js';
import { WEAPONS } from '../src/data/weapons.js';
import { CombatSystem } from '../src/game/CombatSystem.js';
import { RunState } from '../src/game/RunState.js';
import { PremiumVfxDirector } from '../src/game/PremiumVfxDirector.js';
import { applyWeaponSkin, heldWeaponMuzzle, syncWeaponSkin } from '../src/game/SkinPresentation.js';
import { weaponMuzzleUV } from '../src/game/WeaponHandAnchors.js';
import { presentWeaponShot } from '../src/game/WeaponPresentation.js';
import { directionalPose } from '../src/game/animations.js';

globalThis.Phaser = {
  BlendModes: { ADD: 1 },
  Math: { DegToRad: (value) => value * Math.PI / 180, FloatBetween: () => .25 },
};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

function node(x = 0, y = 0, width = 768, height = 384) {
  return {
    x, y, width, height, active: true, scaleX: 1, scaleY: 1, originX: .5, originY: .5,
    frame: { name: 12 }, rotation: 0, depth: 25,
    get displayHeight() { return this.height * this.scaleY; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setFlipY(value) { this.flipY = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setBlendMode() { return this; }, setTint() { return this; },
    destroy() { this.active = false; },
    body: { velocity: {}, setCircle(radius) { this.radius = radius; } },
  };
}

function sceneFor(heroId, weaponId, skin = Object.values(PREMIUM_SKINS)[0]) {
  const atlas = HERO_ATLASES[heroId];
  const player = node(100, 200, atlas.frameWidth, atlas.frameHeight).setScale(78 / atlas.frameHeight);
  const state = new RunState(HEROES[heroId], WEAPONS[weaponId], skin);
  state.ammo = 100;
  const rectangles = [], created = [];
  const scene = {
    state, player, facing: { x: 1, y: 0 }, skinWeaponKey: skin && 'selected-held-weapon', rectangles, created,
    add: {
      image: (x, y) => node(x, y),
      rectangle(x, y) { const result = node(x, y); rectangles.push(result); return result; },
    },
    time: { now: 1000 }, cameras: { main: { shake() {} } }, tweens: { add() {} },
    onShot() {}, flashEffect() {},
    enemies: { getChildren: () => [] },
    bullets: { create(x, y) { const result = node(x, y, 64, 16); created.push(result); return result; } },
    physics: {
      add: { overlap() {} },
      velocityFromRotation(angle, speed, velocity) { velocity.x = Math.cos(angle) * speed; velocity.y = Math.sin(angle) * speed; },
    },
  };
  scene.weaponSkin = applyWeaponSkin(scene);
  return scene;
}

function aimPose(scene, angle, sizeScale = 1, cycleFrame = 0) {
  const pose = directionalPose(Math.cos(angle), Math.sin(angle), true);
  scene.facing = { x: Math.cos(angle), y: Math.sin(angle) };
  scene.player.frame.name = pose.frameRow * 6 + cycleFrame;
  scene.player.flipX = pose.flipX;
  scene.player.setScale(78 / scene.player.height * sizeScale);
  scene.player.rotation = .031; // The existing shot-recoil lean is presentation-only.
  syncWeaponSkin(scene.weaponSkin, scene.player, 0, angle);
}

test('all 32 authored muzzle points lie on the visible mouth or bolt tip', async () => {
  for (const skin of Object.values(PREMIUM_SKINS)) for (const weaponId of Object.keys(WEAPONS)) {
    const uv = weaponMuzzleUV(skin.id, weaponId);
    assert.ok(uv.x > .7 && uv.x < 1 && uv.y > .2 && uv.y < .9);
    const { data, info } = await sharp(fileURLToPath(new URL(`../${skin.weaponArt[weaponId].split('?')[0]}`, import.meta.url)))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cx = Math.round(uv.x * info.width), cy = Math.round(uv.y * info.height);
    let solid = 0;
    for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 8; x++) {
      if (x >= 0 && y >= 0 && x < info.width && y < info.height && data[(y * info.width + x) * 4 + 3] > 100) solid++;
    }
    assert.ok(solid > 20, `${skin.id}/${weaponId} muzzle must touch visible art`);
  }
});

test('muzzle equals the rendered weapon pixel in all eight directions, sizes and recoil poses', () => {
  for (const heroId of Object.keys(HEROES)) for (const skin of Object.values(PREMIUM_SKINS)) {
    for (const weaponId of Object.keys(WEAPONS)) for (const size of [.6, 1, 1.5]) for (let octant = 0; octant < 8; octant++) {
      const scene = sceneFor(heroId, weaponId, skin);
      const angle = octant * Math.PI / 4;
      aimPose(scene, angle, size, octant % 6);
      const muzzle = heldWeaponMuzzle(scene, angle);
      const weapon = scene.weaponSkin.weapon;
      const uv = weaponMuzzleUV(skin.id, weaponId);
      const localX = (uv.x - weapon.originX) * weapon.width * weapon.scaleX;
      const localY = ((weapon.flipY ? 1 - uv.y : uv.y) - weapon.originY) * weapon.height * weapon.scaleY;
      near(muzzle.x, weapon.x + localX * Math.cos(weapon.rotation) - localY * Math.sin(weapon.rotation));
      near(muzzle.y, weapon.y + localX * Math.sin(weapon.rotation) + localY * Math.cos(weapon.rotation));
      weapon.setPosition(-999, -999).setRotation(2).setScale(17);
      assert.deepEqual(heldWeaponMuzzle(scene, angle), muzzle, 'shot origin may not read a stale rendered transform');
    }
  }
});

function capturedShots(scene, angle) {
  const combat = new CombatSystem(scene);
  const shots = [];
  combat.spawnBullet = (x, y, angle, spec) => shots.push({ x, y, angle, spec });
  combat.fire(Math.cos(angle), Math.sin(angle));
  return shots;
}

test('every front gun fires from its held mouth without changing shot stats, spread or count', () => {
  for (const heroId of Object.keys(HEROES)) for (const skin of Object.values(PREMIUM_SKINS)) {
    for (const weaponId of Object.keys(WEAPONS)) for (const upgraded of [false, true]) {
      const scene = sceneFor(heroId, weaponId, skin);
      const base = sceneFor(heroId, weaponId, null);
      const angle = -2.21;
      for (const target of [scene, base]) {
        if (upgraded) target.state.mods = { damageMul: .4, bulletSizeMul: .4, projectileSpeedMul: .2, projectilesAdd: 1, spreadAdd: 4 };
        aimPose(target, angle, upgraded ? 1.5 : 1, 3);
      }
      const muzzle = heldWeaponMuzzle(scene, angle);
      const actual = capturedShots(scene, angle), original = capturedShots(base, angle);
      assert.equal(actual.length, original.length);
      if (weaponId === 'shotgun' && !upgraded) assert.equal(actual.length, 4);
      actual.forEach((shot, index) => {
        near(shot.x, muzzle.x); near(shot.y, muzzle.y);
        near(shot.angle, original[index].angle);
        assert.deepEqual(shot.spec, original[index].spec, 'only front projectile origin changes');
        assert.deepEqual(shot.spec.launchOrigin, { x: scene.player.x, y: scene.player.y });
      });
    }
  }
});

test('no-skin front shots and every rear shot retain their original spawn geometry', () => {
  for (const skin of [null, ...Object.values(PREMIUM_SKINS)]) for (const weaponId of Object.keys(WEAPONS)) {
    const scene = sceneFor('shana', weaponId, skin);
    scene.state.flags.backShot = true;
    const angle = .42;
    const shots = capturedShots(scene, angle);
    const rear = shots.at(-1);
    assert.equal(rear.spec.sourceType, 'rear');
    near(rear.x, scene.player.x + Math.cos(angle + Math.PI) * 22);
    near(rear.y, scene.player.y + Math.sin(angle + Math.PI) * 22);
    if (!skin) for (const shot of shots.slice(0, -1)) {
      near(shot.x, scene.player.x + Math.cos(shot.angle) * 26);
      near(shot.y, scene.player.y + Math.sin(shot.angle) * 26);
    }
  }
});

test('real spawning sweeps player to held muzzle so point-blank enemies remain hittable', () => {
  for (const weaponId of Object.keys(WEAPONS)) {
    const scene = sceneFor('hina', weaponId);
    const angle = .37;
    aimPose(scene, angle);
    const muzzle = heldWeaponMuzzle(scene, angle);
    const close = {
      active: true, spawnId: 1, enemyDef: { radius: 2 },
      x: scene.player.x + (muzzle.x - scene.player.x) * .45,
      y: scene.player.y + (muzzle.y - scene.player.y) * .45,
    };
    scene.enemies.getChildren = () => [close];
    const combat = new CombatSystem(scene);
    const hits = [];
    combat.hitEnemy = (bullet, enemy) => { hits.push(enemy); bullet.destroy(); };
    combat.fire(Math.cos(angle), Math.sin(angle));
    assert.equal(hits.length, WEAPONS[weaponId].projectiles);
    assert.ok(hits.every((enemy) => enemy === close));
    for (const bullet of scene.created) { near(bullet.x, muzzle.x); near(bullet.y, muzzle.y); }
  }
});

test('main flash, pellet tracers, power accents and recoil strip share the bullet mouth', () => {
  for (const weaponId of Object.keys(WEAPONS)) {
    const scene = sceneFor('diamond', weaponId);
    scene.state.owned = new Set(['power_shot', 'big_shot', 'reaper_rounds', 'double_shot']);
    scene.state.mods.bulletSizeMul = .4;
    const angle = -.73;
    aimPose(scene, angle, 1.5, 2);
    const muzzle = heldWeaponMuzzle(scene, angle);
    const effects = [];
    scene.premiumVfx = new PremiumVfxDirector(scene, scene.state.skin);
    scene.premiumVfx.emit = (frame, x, y, options) => effects.push({ frame, x, y, options });
    scene.onShot = (aim, info) => presentWeaponShot(scene, aim, info.shotAngles);
    const shots = capturedShots(scene, angle);
    assert.ok(effects.length >= shots.length + 2, 'muzzle, real-angle tracers and multi accent are emitted');
    for (const effect of effects) { near(effect.x, muzzle.x); near(effect.y, muzzle.y); }
    assert.equal(scene.rectangles.length, 1);
    near(scene.rectangles[0].x, muzzle.x); near(scene.rectangles[0].y, muzzle.y);
  }
});
