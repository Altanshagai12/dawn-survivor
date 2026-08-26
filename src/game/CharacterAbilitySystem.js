import { HERO_ATLASES } from '../config/assets.js?build=20260825r';
import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260826c';

export class CharacterAbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.dashUntil = 0;
    this.nextDashAt = 0;
    this.clones = [];
  }

  update(input) {
    const now = this.scene.time.now;
    if (input.ability && this.scene.state.hero.id === 'hina' && now >= this.nextDashAt) this.startDash(input);
    this.updateClones(now);
    if (now >= this.dashUntil) return false;
    const config = TEN_MINUTES_BALANCE.player.hina;
    const speed = config.dashDistance / config.dashDuration;
    this.scene.player.setVelocity(this.dashVector.x * speed, this.dashVector.y * speed);
    return true;
  }

  startDash(input) {
    const config = TEN_MINUTES_BALANCE.player.hina;
    const length = Math.hypot(input.aimX, input.aimY) || 1;
    this.dashVector = { x: input.aimX / length, y: input.aimY / length };
    this.dashUntil = this.scene.time.now + config.dashDuration * 1000;
    this.nextDashAt = this.scene.time.now + config.cooldown * 1000;
    this.spawnClone();
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 6, .8);
  }

  spawnClone() {
    const config = TEN_MINUTES_BALANCE.player.hina;
    const atlas = HERO_ATLASES.hina;
    const clone = this.scene.add.sprite(this.scene.player.x, this.scene.player.y, atlas.key, 24)
      .setDepth(23).setScale(this.scene.player.scaleX).setAlpha(.58).setTint(0xaa70ff);
    clone.expiresAt = this.scene.time.now + config.cloneDuration * 1000;
    clone.nextAttackAt = this.scene.time.now + 120;
    this.clones.push(clone);
  }

  updateClones(now) {
    const config = TEN_MINUTES_BALANCE.player.hina;
    this.clones = this.clones.filter((clone) => {
      if (!clone.active || now >= clone.expiresAt) { clone.destroy(); return false; }
      if (now < clone.nextAttackAt) return true;
      clone.nextAttackAt = now + config.cloneAttackInterval * 1000;
      const target = this.scene.nearestEnemy(clone.x, clone.y, config.cloneRange);
      if (!target) return true;
      const angle = Phaser.Math.Angle.Between(clone.x, clone.y, target.x, target.y);
      this.scene.combat.spawnBullet(clone.x, clone.y, angle, {
        damage: this.scene.state.weapon.damage * this.scene.state.multiplierStats.damage
          * this.scene.state.multiplierStats.summonDamage,
        speed: this.scene.state.weapon.projectileSpeed,
        life: this.scene.state.weapon.projectileLife,
        size: this.scene.state.weapon.bulletSize,
        knockback: this.scene.state.weapon.knockback,
        texture: this.scene.state.weapon.projectileTexture,
        summon: true,
      });
      clone.setRotation(angle + Math.PI / 2);
      this.scene.flashEffect(clone.x, clone.y, 6, .3);
      return true;
    });
  }

  destroy() {
    this.clones.forEach((clone) => clone.destroy());
    this.clones = [];
  }
}
