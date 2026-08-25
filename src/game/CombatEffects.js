export class CombatEffects {
  constructor(scene, combat) {
    this.scene = scene;
    this.combat = combat;
  }

  applyBurn(enemy, burnDps = 3) {
    enemy.status.burnUntil = Math.max(enemy.status.burnUntil, this.scene.time.now + 3200);
    enemy.status.burnDamage = burnDps * .5 * this.scene.state.multiplierStats.burnDamage;
    this.scene.flashEffect(enemy.x, enemy.y, 2, .26);
    if (this.scene.state.flags.burnHealChance && Math.random() < this.scene.state.flags.burnHealChance) {
      this.scene.state.heal(1);
      this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 5, .55);
    }
  }

  applyFreeze(enemy) {
    const duration = enemy.enemyDef.boss ? 300 : 1500;
    const newlyFrozen = enemy.status.freezeUntil < this.scene.time.now;
    enemy.status.freezeUntil = this.scene.time.now + duration;
    if (newlyFrozen && this.scene.state.flags.frostbite) {
      const ratio = enemy.enemyDef.boss ? .01 : this.scene.state.flags.frostbite;
      this.combat.damageEnemy(enemy, enemy.maxHp * ratio, { frostbite: true });
      if (!enemy.active) return;
    }
    enemy.setTint(0x8eeeff);
    this.scene.flashEffect(enemy.x, enemy.y, 3, .32);
  }

  applyCurse(enemy, bulletDamage) {
    const multiplier = 2 + (this.scene.state.flags.curseDamageMulAdd || 0);
    enemy.status.curseAt = this.scene.time.now + 750;
    enemy.status.curseUntil = this.scene.time.now + 1800;
    enemy.status.curseDamage = bulletDamage * multiplier;
    enemy.setTint(0xb05cff);
    this.scene.flashEffect(enemy.x, enemy.y, 6, .28);
  }

  lightning(enemy, source = {}) {
    if (!enemy?.active) return;
    const state = this.scene.state;
    const damage = (22 + (state.flags.lightningFlatAdd || 0)) * state.multiplierStats.lightningDamage;
    const radius = 52 * (1 + (state.flags.lightningAreaMul || 0));
    this.combat.damageEnemy(enemy, damage, { ...source, lightning: true });
    this.scene.flashEffect(enemy.x, enemy.y, 4, .72 + radius / 180);
    this.scene.enemies.getChildren().forEach((nearby) => {
      if (!nearby?.active || nearby === enemy) return;
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, nearby.x, nearby.y) <= radius) {
        this.combat.damageEnemy(nearby, damage * .45, { ...source, lightning: true });
      }
    });
    if (state.flags.lightningAmmo && Math.random() < .2) state.ammo = Math.min(state.magazine, state.ammo + 3);
  }

  explode(x, y, damage, radius = 90, source = {}) {
    const actualRadius = radius * this.scene.state.multiplierStats.explosionRadius;
    this.scene.flashEffect(x, y, 2, actualRadius / 55);
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (enemy?.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= actualRadius) {
        this.combat.damageEnemy(enemy, damage * this.scene.state.multiplierStats.explosionDamage, source);
      }
    });
  }

  smite() {
    const state = this.scene.state;
    const damage = 20 + (state.flags.smiteHpScale ? state.hp * 10 : 0);
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 5, 1.05);
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (enemy?.active && Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y) < 210) {
        this.combat.damageEnemy(enemy, damage, { smite: true });
      }
    });
  }

  iceShards(angle) {
    [-.2, 0, .2].forEach((offset) => this.combat.spawnBullet(
      this.scene.player.x,
      this.scene.player.y,
      angle + offset,
      { damage: 8, speed: 500, life: .85, size: 9, freezeChance: 1, texture: 'bullet-spirit' },
    ));
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 3, .6);
  }

  fireball(angle) {
    this.combat.spawnBullet(this.scene.player.x, this.scene.player.y, angle, {
      damage: 40, speed: 380, life: 1.25, size: 18, burnChance: 1, burnDps: 3,
      explosionDamage: 22, texture: 'bullet-flame',
    });
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 2, .75);
  }
}
