export class UpgradeEffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.timers = {};
  }

  showAcquired(upgrade) {
    if (!Number.isInteger(upgrade?.iconFrame)) return;
    const icon = this.scene.add.image(
      this.scene.player.x,
      this.scene.player.y - this.scene.player.displayHeight * .55,
      'upgrade-icons',
      upgrade.iconFrame,
    ).setDepth(70).setScale(.16).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: icon,
      y: icon.y - 58,
      scale: .72,
      alpha: { from: 0, to: 1 },
      duration: 420,
      ease: 'Back.Out',
      yoyo: true,
      hold: 520,
      onComplete: () => icon.destroy(),
    });
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, upgrade.tree === 'holy' ? 5 : 7, .85);
  }

  update(delta, input) {
    const { flags } = this.scene.state;
    if (flags.glare) this.updateGlare(delta);
    if (flags.aeroMagic) this.updateGale(delta);
    if (flags.blazingSpeed && Math.hypot(input.moveX, input.moveY) > .25) this.updateBlazing(delta);
    if (flags.divineWrath && this.scene.state.shieldReady) this.updateShieldWrath(delta);
  }

  advance(key, delta, interval) {
    this.timers[key] = (this.timers[key] || 0) + delta;
    if (this.timers[key] < interval) return false;
    this.timers[key] %= interval;
    return true;
  }

  updateGlare(delta) {
    const state = this.scene.state;
    if (!this.advance('glare', delta, state.flags.saccade ? .5 : 1)) return;
    const radius = 210 * state.multiplierStats.vision;
    const damage = state.flags.intenseGlare ? 30 : 15;
    this.ring(radius, 0x8cecff, .3);
    this.eachEnemy(radius, (enemy) => {
      this.scene.combat.damageEnemy(enemy, damage, { glare: true });
      if (!enemy.active || !state.flags.sightMagic) return;
      if (Math.random() < (state.flags.burnChanceAdd || 0)) this.scene.combat.effects.applyBurn(enemy, 3);
      if (enemy.active && Math.random() < (state.flags.freezeChanceAdd || 0)) this.scene.combat.effects.applyFreeze(enemy);
      if (enemy.active && Math.random() < (state.flags.curseChanceAdd || 0)) this.scene.combat.effects.applyCurse(enemy, damage);
    });
  }

  updateGale(delta) {
    if (!this.advance('gale', delta, 2)) return;
    const state = this.scene.state;
    let damage = 20 + (state.flags.galeFlatAdd || 0);
    if (state.flags.galeMoveScale) damage *= state.multiplierStats.moveSpeed;
    const radius = state.flags.eyeStorm ? 185 : 145;
    this.ring(radius, 0xa8efff, .55);
    this.eachEnemy(radius, (enemy, distance) => {
      const multiplier = state.flags.eyeStorm && distance < 90 ? 2 : 1;
      this.scene.combat.damageEnemy(enemy, damage * multiplier, { gale: true });
    });
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 7, 1.15);
  }

  updateBlazing(delta) {
    const interval = .32 / Math.max(.5, this.scene.state.multiplierStats.moveSpeed);
    if (!this.advance('blazing', delta, interval)) return;
    const { x, y } = this.scene.player;
    const ember = this.scene.add.sprite(x, y + 25, 'combat-vfx', 12)
      .setDepth(23).setScale(.23).setAlpha(.72).setBlendMode(Phaser.BlendModes.ADD);
    ember.play('combat-vfx-2');
    ember.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => ember.destroy());
    this.eachEnemy(70, (enemy) => this.scene.combat.effects.applyBurn(enemy, 3));
  }

  updateShieldWrath(delta) {
    if (!this.advance('wrath', delta, 1)) return;
    const target = this.scene.nearestEnemy(this.scene.player.x, this.scene.player.y, 430);
    if (target) this.scene.combat.effects.lightning(target, { smite: true });
  }

  eachEnemy(radius, callback) {
    const { x, y } = this.scene.player;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= radius) callback(enemy, distance);
    });
  }

  ring(radius, color, alpha) {
    const ring = this.scene.add.circle(this.scene.player.x, this.scene.player.y, radius, color, 0)
      .setDepth(22).setStrokeStyle(4, color, alpha).setBlendMode(Phaser.BlendModes.ADD).setScale(.25);
    this.scene.tweens.add({
      targets: ring, scale: 1, alpha: 0, duration: 480, ease: 'Quad.Out', onComplete: () => ring.destroy(),
    });
  }
}
