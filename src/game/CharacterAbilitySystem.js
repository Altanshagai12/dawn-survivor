import { HERO_ATLASES } from '../config/assets.js?build=20260825r';
import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260827d';

export function dashCooldownState(now, nextDashAt, cooldownSeconds) {
  const durationMs = Math.max(1, cooldownSeconds * 1000);
  const remainingMs = Math.max(0, nextDashAt - now);
  return {
    ready: remainingMs === 0,
    remainingMs,
    progress: Math.min(1, Math.max(0, 1 - remainingMs / durationMs)),
  };
}

export function movementDashDirection(input, fallback = { x: 0, y: 1 }) {
  const moveLength = Math.hypot(input.moveX || 0, input.moveY || 0);
  if (moveLength > .08) return { x: input.moveX / moveLength, y: input.moveY / moveLength };
  const fallbackLength = Math.hypot(fallback.x || 0, fallback.y || 0) || 1;
  return { x: fallback.x / fallbackLength, y: fallback.y / fallbackLength };
}

export class CharacterAbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.dashUntil = 0;
    this.nextDashAt = 0;
    this.lastMoveDirection = { x: 0, y: 1 };
    this.clones = [];
  }

  update(input) {
    const now = this.scene.time.now;
    if (Math.hypot(input.moveX || 0, input.moveY || 0) > .08) {
      this.lastMoveDirection = movementDashDirection(input, this.lastMoveDirection);
    }
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
    this.dashVector = movementDashDirection(input, this.lastMoveDirection);
    this.dashUntil = this.scene.time.now + config.dashDuration * 1000;
    this.nextDashAt = this.scene.time.now + config.cooldown * 1000;
    this.spawnClone();
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 6, .8);
  }

  getDashCooldownState(now = this.scene.time.now) {
    return dashCooldownState(
      now,
      this.nextDashAt,
      TEN_MINUTES_BALANCE.player.hina.cooldown,
    );
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
