import { activePresentationRecipe, upgradePresentation } from './UpgradePresentationProfiles.js?build=20260828e';

const WEAPON_FRAMES = Object.freeze({ revolver: 1, shotgun: 2, crossbow: 3, flame: 4 });
const PROJECTILE_FRAMES = Object.freeze({ revolver: 5, shotgun: 6, crossbow: 3, flame: 5 });
const STATUS_FRAMES = Object.freeze({ burn: 12, freeze: 13, lightning: 14, curse: 15, dash: 15 });
const SPECIAL_FRAMES = Object.freeze({
  dash: 15, fan: 11, rear: 10, splinter: 7, summon: 6, clone: 15,
  ice: 13, fireball: 12, glare: 14, gale: 15, blazing: 12, shield: 14,
  scythe: 10, shatter: 13,
});

function easeOut(value) { return 1 - (1 - value) ** 3; }

export class PremiumVfxDirector {
  constructor(scene, skin) {
    this.scene = scene;
    this.skin = skin;
    this.pool = [];
    this.active = [];
    this.nextMoveTrailAt = 0;
    this.cap = scene.performance?.premiumVfxCap || (scene.performance?.mobile ? 42 : 96);
    this.aura = [];
    if (skin && scene.textures.exists(skin.vfxKey)) this.createAura();
  }

  createAura() {
    const back = this.scene.add.image(0, 0, this.skin.vfxKey, 0)
      .setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.42);
    back.premiumBaseAlpha = .42;
    const front = this.scene.add.image(0, 0, this.skin.vfxKey, 0)
      .setDepth(34).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.17);
    front.premiumBaseAlpha = .17;
    this.aura.push(back, front);
    for (let index = 0; index < 3; index += 1) {
      const mote = this.scene.add.image(0, 0, this.skin.vfxKey, 6)
        .setDepth(33).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.72);
      mote.premiumBaseAlpha = .72;
      this.aura.push(mote);
    }
  }

  setPlayerVisibility(multiplier = 1) {
    const visibility = Phaser.Math.Clamp(multiplier, 0, 1);
    this.aura.forEach((node) => node.setAlpha((node.premiumBaseAlpha ?? 1) * visibility));
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
    entry.node.setTexture(this.skin.vfxKey, frame).setPosition(x, y)
      .setDepth(options.depth || 37).setRotation(options.rotation || 0)
      .setScale(entry.startScaleX, entry.startScaleY).setAlpha(entry.startAlpha).setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (!this.active.includes(entry)) this.active.push(entry);
    return entry.node;
  }

  release(entry) {
    entry.active = false;
    entry.node.setVisible(false);
  }

  update(delta, input = {}) {
    if (!this.skin) return;
    const deltaMs = delta * 1000;
    this.active.forEach((entry) => {
      if (!entry.active) return;
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
    this.updateAura();
    this.updateMovement(input);
  }

  updateAura() {
    if (!this.aura.length || !this.scene.player?.active) return;
    const now = this.scene.time.now;
    const recipe = activePresentationRecipe(this.scene.state);
    const pulse = 1 + Math.sin(now * .004) * .055;
    const baseScale = (.28 + Math.min(.08, recipe.heroTier * .008)) * pulse;
    const [back, front, ...motes] = this.aura;
    back.setPosition(this.scene.player.x, this.scene.player.y + 5).setScale(baseScale).setRotation(now * .00025);
    front.setPosition(this.scene.player.x, this.scene.player.y - 2).setScale(baseScale * .68).setRotation(-now * .00038);
    motes.forEach((mote, index) => {
      const angle = now * .0011 + index * Math.PI * 2 / motes.length;
      const radius = 31 + recipe.heroTier * .6;
      mote.setPosition(this.scene.player.x + Math.cos(angle) * radius,
        this.scene.player.y + Math.sin(angle) * radius * .7)
        .setScale(.055 + index * .006).setRotation(angle);
    });
  }

  updateMovement(input) {
    if (this.scene.time.now < this.nextMoveTrailAt || Math.hypot(input.moveX || 0, input.moveY || 0) < .35) return;
    const recipe = activePresentationRecipe(this.scene.state);
    this.nextMoveTrailAt = this.scene.time.now + Math.max(45, (this.scene.performance?.mobile ? 110 : 72) - recipe.trailRate * 7);
    this.emit(recipe.fire ? 12 : 6, this.scene.player.x - (input.moveX || 0) * 18,
      this.scene.player.y - (input.moveY || 0) * 18 + 9, {
        scale: .045 + recipe.trailRate * .004, endScale: .11, duration: 250,
        rotation: Math.atan2(input.moveY || 0, input.moveX || 0), depth: 22,
      });
  }

  projectileFrame(weaponId) { return PROJECTILE_FRAMES[weaponId] ?? 5; }

  styleProjectile(bullet, size, weaponId) {
    if (!bullet || !this.skin) return;
    const recipe = activePresentationRecipe(this.scene.state);
    const base = weaponId === 'crossbow' ? .085 : weaponId === 'shotgun' ? .045 : .062;
    bullet.setTexture(this.skin.vfxKey, this.projectileFrame(weaponId))
      .setScale(base * Math.max(.72, size / 8) * recipe.powerScale)
      .setBlendMode(Phaser.BlendModes.ADD);
    bullet.premiumVfxScale = base * Math.max(.72, size / 8) * recipe.powerScale;
  }

  shot(angle, authoredAngles = []) {
    const { weapon } = this.scene.state;
    const recipe = activePresentationRecipe(this.scene.state);
    const x = this.scene.player.x + Math.cos(angle) * 27;
    const y = this.scene.player.y + Math.sin(angle) * 27;
    this.emit(WEAPON_FRAMES[weapon.id] ?? 1, x, y, {
      rotation: angle, scale: weapon.id === 'shotgun' ? .2 : .15, endScale: .28,
      duration: weapon.id === 'flame' ? 240 : 155, priority: 3,
    });
    const tracerAngles = authoredAngles.length ? authoredAngles : [angle];
    tracerAngles.forEach((shotAngle) => this.emit(6, x, y, {
      rotation: shotAngle, scaleX: weapon.id === 'crossbow' ? .34 : weapon.id === 'shotgun' ? .2 : .23,
      scaleY: weapon.id === 'flame' ? .085 : .035, endScaleX: weapon.id === 'crossbow' ? .48 : .34,
      endScaleY: .018, duration: weapon.id === 'crossbow' ? 170 : 120, alpha: .86, priority: 2,
    }));
    if (recipe.multiTier || authoredAngles.length > 1) this.emit(11, x, y, {
      rotation: angle, scale: .11, endScale: .26 + recipe.multiTier * .02, duration: 190, priority: 2,
    });
    if (recipe.powerScale > 1.1) this.emit(10, x, y, {
      rotation: angle, scale: .08, endScale: .2 * recipe.powerScale, duration: 175,
    });
  }

  trail(bullet) {
    if (!bullet?.active || this.scene.time.now < (bullet.nextPremiumTrailAt || 0)) return;
    const recipe = activePresentationRecipe(this.scene.state);
    bullet.nextPremiumTrailAt = this.scene.time.now + Math.max(34,
      (this.scene.performance?.mobile ? 96 : 58) - recipe.trailRate * 5);
    const angle = bullet.rotation || 0;
    this.emit(recipe.fire && bullet.burnChance ? 12 : 6,
      bullet.x - Math.cos(angle) * 10, bullet.y - Math.sin(angle) * 10, {
        rotation: angle, scale: Math.max(.035, (bullet.premiumVfxScale || .06) * .7),
        endScale: .025, duration: 180, alpha: .7, depth: 29,
      });
  }

  impact(bullet, x, y) {
    const recipe = activePresentationRecipe(this.scene.state);
    this.emit(7, x, y, { scale: .1 * recipe.powerScale, endScale: .3 * recipe.powerScale, duration: 235, priority: 2 });
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
    this.emit(9, bullet.x, bullet.y, { rotation: bullet.rotation, scale: .075, endScale: .2, duration: 175, priority: 2 });
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
    this.aura.forEach((node) => node.destroy());
    this.pool.forEach(({ node }) => node.destroy());
    this.aura = [];
    this.pool = [];
    this.active = [];
  }
}
