import { activePresentationRecipe, upgradePresentation } from './UpgradePresentationProfiles.js?build=20260828e';
import { skinProjectileAnchor, skinProjectileRotation } from '../data/skins.js?build=20260902b';
import { syncProjectileVisualRotation } from './ProjectileGeometry.js?build=20260903c';
import { premiumProjectileScale, premiumProjectileCoreScale } from './PremiumProjectileSizing.js?build=20260903c';
import { heldWeaponMuzzle } from './SkinPresentation.js?build=20260902e';

export { premiumProjectileScale, premiumProjectileCoreScale };

const WEAPON_FRAMES = Object.freeze({ revolver: 1, shotgun: 7, crossbow: 3, flame: 4 });
const PROJECTILE_FRAMES = Object.freeze({ revolver: 5, shotgun: 6, crossbow: 3, flame: 4 });
const IMPACT_FRAMES = Object.freeze({ revolver: 1, shotgun: 7, crossbow: 10, flame: 4 });
const STATUS_FRAMES = Object.freeze({ burn: 12, freeze: 13, lightning: 14, curse: 15 });
const SPECIAL_FRAMES = Object.freeze({
  fan: 11, rear: 10, splinter: 7, summon: 6,
  ice: 13, fireball: 12, glare: 14, gale: 15, blazing: 12, shield: 14,
  scythe: 10, shatter: 13,
});

export function premiumShotLayout(weaponId = 'revolver', trajectoryAngle = 0) {
  const shotgun = weaponId === 'shotgun';
  return {
    muzzleFrame: WEAPON_FRAMES[weaponId] ?? WEAPON_FRAMES.revolver,
    muzzleOffset: shotgun ? 42 : 27,
    muzzleDepth: shotgun ? 24.4 : 37,
    muzzleRotation: shotgun ? 0 : trajectoryAngle,
  };
}

function easeOut(value) { return 1 - (1 - value) ** 3; }

export class PremiumVfxDirector {
  constructor(scene, skin) {
    this.scene = scene;
    this.skin = skin;
    this.pool = [];
    this.active = [];
    this.cap = scene.performance?.premiumVfxCap || (scene.performance?.mobile ? 42 : 96);
    // Arcade Body.postUpdate writes the final sprite transform after Scene.update.
    // Follow it here so fast projectiles never outrun their decorative layer.
    scene.events?.on('postupdate', this.syncFollowers, this);
  }

  obtain() {
    const cached = this.pool.find((entry) => !entry.active);
    if (cached) return cached;
    if (this.pool.length >= this.cap) return null;
    const node = this.scene.add.image(0, 0, this.skin.vfxKey, 0).setVisible(false);
    const entry = { node, active: false };
    this.pool.push(entry);
    return entry;
  }

  emit(frame, x, y, options = {}) {
    if (!this.skin) return null;
    let entry = this.obtain();
    if (!entry && (options.priority || 0) >= 2) {
      entry = this.active.find((candidate) => (candidate.priority || 0) < (options.priority || 0));
      if (entry) this.release(entry);
    }
    if (!entry) return null;
    entry.active = true;
    entry.age = 0;
    entry.duration = options.duration || 180;
    entry.startScaleX = options.scaleX ?? options.scale ?? .16;
    entry.startScaleY = options.scaleY ?? options.scale ?? .16;
    entry.endScaleX = options.endScaleX ?? options.endScale ?? entry.startScaleX * 1.45;
    entry.endScaleY = options.endScaleY ?? options.endScale ?? entry.startScaleY * 1.45;
    entry.startAlpha = options.alpha ?? .92;
    entry.vx = options.vx || 0;
    entry.vy = options.vy || 0;
    entry.spin = options.spin || 0;
    entry.priority = options.priority || 0;
    entry.follow = options.follow || null;
    if (entry.follow) {
      const owner = entry.follow;
      owner.once?.('destroy', () => {
        if (entry.follow === owner) this.release(entry);
      });
    }
    entry.node.setTexture(this.skin.vfxKey, frame).setPosition(x, y)
      .setOrigin(options.originX ?? .5, options.originY ?? .5)
      .setDepth(options.depth ?? 37).setRotation(options.rotation || 0)
      .setScale(entry.startScaleX, entry.startScaleY).setAlpha(entry.startAlpha).setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (!this.active.includes(entry)) this.active.push(entry);
    return entry.node;
  }

  release(entry) {
    entry.active = false;
    entry.follow = null;
    entry.node.setVisible(false);
  }

  syncFollowers() {
    this.active.forEach((entry) => {
      if (!entry.active || !entry.follow) return;
      if (!entry.follow.active) { this.release(entry); return; }
      entry.node.setPosition(entry.follow.x, entry.follow.y).setRotation(entry.follow.rotation);
    });
  }

  update(delta) {
    if (!this.skin) return;
    const deltaMs = delta * 1000;
    this.active.forEach((entry) => {
      if (!entry.active) return;
      if (entry.follow) {
        if (!entry.follow.active) { this.release(entry); return; }
        return;
      }
      entry.age += deltaMs;
      if (entry.age >= entry.duration) { this.release(entry); return; }
      const progress = easeOut(entry.age / entry.duration);
      entry.node.x += entry.vx * delta;
      entry.node.y += entry.vy * delta;
      entry.node.rotation += entry.spin * delta;
      entry.node.setScale(
        Phaser.Math.Linear(entry.startScaleX, entry.endScaleX, progress),
        Phaser.Math.Linear(entry.startScaleY, entry.endScaleY, progress),
      );
      entry.node.setAlpha(entry.startAlpha * (1 - progress));
    });
    this.active = this.active.filter((entry) => entry.active);
  }

  projectileFrame(weaponId) { return PROJECTILE_FRAMES[weaponId] ?? 5; }

  styleProjectile(bullet, size, weaponId) {
    if (!bullet?.skin || !this.skin || !weaponId) return;
    const scale = premiumProjectileCoreScale(size, weaponId, bullet.skin);
    const anchor = skinProjectileAnchor(this.skin, weaponId);
    bullet.setTexture(this.skin.vfxKey, this.projectileFrame(weaponId))
      .setOrigin(anchor.x, anchor.y)
      .setScale(scale)
      .setBlendMode(Phaser.BlendModes.ADD);
    bullet.premiumVfxScale = scale;
    bullet.premiumVfxSize = size;
    bullet.visualRotationOffset = skinProjectileRotation(this.skin, weaponId);
    syncProjectileVisualRotation(bullet, bullet.trajectoryAngle || 0);
    const power = activePresentationRecipe(this.scene.state).powerScale;
    bullet.premiumAuraScale = premiumProjectileScale(size, weaponId, bullet.skin, power);
    // The full-bright core is guaranteed to hit. Larger, softer ornamentation
    // restores skin identity without making its glow a separate damage body.
    this.emit(this.projectileFrame(weaponId), bullet.x, bullet.y, {
      follow: bullet, rotation: bullet.rotation, originX: anchor.x, originY: anchor.y,
      scale: bullet.premiumAuraScale, endScale: bullet.premiumAuraScale,
      alpha: .38, depth: 29, priority: 1,
    });
  }

  shot(angle, authoredAngles = []) {
    const { weapon } = this.scene.state;
    const recipe = activePresentationRecipe(this.scene.state);
    const size = weapon.bulletSize * this.scene.state.multiplierStats.bulletSize;
    const tightRadius = size / 2;
    const coreScale = premiumProjectileCoreScale(size, weapon.id, this.skin);
    const layout = premiumShotLayout(weapon.id, angle);
    const muzzle = heldWeaponMuzzle(this.scene, angle);
    const x = muzzle?.x ?? this.scene.player.x + Math.cos(angle) * layout.muzzleOffset;
    const y = muzzle?.y ?? this.scene.player.y + Math.sin(angle) * layout.muzzleOffset;
    this.emit(layout.muzzleFrame, x, y, {
      rotation: layout.muzzleRotation, depth: layout.muzzleDepth,
      scale: ((weapon.id === 'shotgun' ? .09 : .15) * 1.12 + tightRadius / 80) / 2,
      endScale: (.28 * 1.12 + tightRadius / 56) / 2,
      duration: weapon.id === 'flame' ? 165 : 123, alpha: .7, priority: 3,
    });
    const tracerAngles = authoredAngles.length ? authoredAngles : [angle];
    tracerAngles.forEach((shotAngle) => {
      const anchor = skinProjectileAnchor(this.skin, weapon.id);
      // A faint launch afterimage follows the real pellet origin, never the
      // cosmetic barrel offset. It cannot masquerade as a larger parallel shot.
      this.emit(this.projectileFrame(weapon.id),
        this.scene.player.x + Math.cos(shotAngle) * 26,
        this.scene.player.y + Math.sin(shotAngle) * 26, {
        rotation: shotAngle + skinProjectileRotation(this.skin, weapon.id),
        originX: anchor.x, originY: anchor.y, depth: 29,
        scale: coreScale, endScale: coreScale * .4,
        duration: 60, alpha: .3, priority: 2,
      });
    });
    if (recipe.powerScale > 1.1) {
      this.emit(layout.muzzleFrame, x, y, {
        rotation: layout.muzzleRotation, depth: layout.muzzleDepth,
        scale: tightRadius / 100, endScale: tightRadius / 72, duration: 80, alpha: .3,
      });
    }
  }

  trail(bullet) {
    if (!bullet?.active || !bullet.skin || !bullet.premiumVfxScale
      || this.scene.time.now < (bullet.nextPremiumTrailAt || 0)) return;
    const recipe = activePresentationRecipe(this.scene.state);
    bullet.nextPremiumTrailAt = this.scene.time.now + Math.max(34,
      (this.scene.performance?.mobile ? 96 : 58) - recipe.trailRate * 5);
    const angle = bullet.trajectoryAngle ?? bullet.rotation ?? 0;
    const anchor = skinProjectileAnchor(this.skin, bullet.weaponId);
    const offset = (bullet.collisionRadius || 0) * .8;
    this.emit(this.projectileFrame(bullet.weaponId),
      bullet.x - Math.cos(angle) * offset, bullet.y - Math.sin(angle) * offset, {
        rotation: bullet.rotation, originX: anchor.x, originY: anchor.y,
        scale: (bullet.premiumAuraScale || bullet.premiumVfxScale) * .65,
        endScale: bullet.premiumVfxScale * .1, duration: 95, alpha: .2, depth: 29,
      });
  }

  impact(bullet, x, y) {
    const recipe = activePresentationRecipe(this.scene.state);
    const tightRadius = (bullet?.premiumVfxSize || this.scene.state.weapon.bulletSize) / 2;
    this.emit(IMPACT_FRAMES[bullet?.weaponId] ?? 7, x, y, {
      scale: (.1 * recipe.powerScale * 1.12 + tightRadius / 80) / 2,
      endScale: (.3 * recipe.powerScale * 1.12 + tightRadius / 48) / 2,
      duration: 185, alpha: .78, priority: 2,
    });
    if (bullet?.burnChance || recipe.fire) this.status('burn', x, y, .08);
    if (bullet?.freezeChance || recipe.frost) this.status('freeze', x, y, .075);
    if (recipe.electric) this.status('lightning', x, y, .065);
    if ((bullet?.pierce || 0) > 0 || recipe.pierce) this.emit(10, x, y, {
      rotation: bullet?.rotation || 0, scale: .07, endScale: .18, duration: 180,
    });
  }

  status(type, x, y, scale = .1) {
    const frame = STATUS_FRAMES[type];
    if (frame == null) return;
    this.emit(frame, x, y, { scale, endScale: scale * 1.9, duration: 260, priority: 1 });
  }

  ricochet(bullet) {
    this.emit(9, bullet.x, bullet.y, { rotation: bullet.trajectoryAngle ?? bullet.rotation,
      scale: .075, endScale: .2, duration: 175, priority: 2 });
  }

  reload(stage) {
    this.emit(8, this.scene.player.x, this.scene.player.y, {
      scale: stage === 'start' ? .1 : .16, endScale: stage === 'start' ? .22 : .35,
      duration: stage === 'start' ? 360 : 260, spin: stage === 'start' ? 2.4 : -1.8, depth: 35, priority: 2,
    });
  }

  specialVolley(type, angle = 0) {
    this.specialAt(type, this.scene.player.x, this.scene.player.y, angle);
  }

  specialAt(type, x, y, angle = 0, scale = .15) {
    this.emit(SPECIAL_FRAMES[type] ?? 11, x, y, {
      rotation: angle, scale, endScale: type === 'fan' ? .48 : scale * 2.26,
      duration: type === 'fan' ? 320 : 220, priority: 3,
    });
  }

  upgradeAcquired(upgrade) {
    const recipe = upgradePresentation(upgrade?.id);
    if (!recipe) return;
    this.emit(recipe.frame, this.scene.player.x, this.scene.player.y - 16, {
      rotation: recipe.rotation, scale: .1 + recipe.signature * .045,
      endScale: (upgrade.type === 'tome' ? .62 : .32) + recipe.signature * .12,
      duration: upgrade.type === 'tome' ? 720 : 460, spin: recipe.family === 'reload' ? 1.6 : 0,
      depth: 72, priority: 3,
    });
  }

  destroy() {
    this.scene.events?.off('postupdate', this.syncFollowers, this);
    this.pool.forEach((entry) => { this.release(entry); entry.node.destroy(); });
    this.pool = [];
    this.active = [];
  }
}
