import { clamp } from './simulation.js';
import { shouldConsumeAmmo, upgradedProjectileCount } from './WeaponMechanics.js';

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.nextShotAt = 0;
    this.scene.physics.add.overlap(scene.bullets, scene.enemies, (bullet, enemy) => this.hitEnemy(bullet, enemy));
  }

  update(deltaMs, input) {
    const state = this.scene.state;
    if (state.reloading) {
      state.reloadProgress += deltaMs;
      if (state.reloadProgress >= state.reloadMs) this.finishReload();
    }
    if (input.reload && state.ammo < state.magazine && !state.reloading) this.startReload();
    if (input.firing && !state.reloading && this.scene.time.now >= this.nextShotAt) {
      if (state.ammo > 0) this.fire(input.aimX, input.aimY);
      else this.startReload();
    }
    this.scene.bullets.getChildren().forEach((bullet) => {
      if (!bullet?.active) return;
      if (bullet.homingTarget?.active) {
        const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, bullet.homingTarget.x, bullet.homingTarget.y);
        this.scene.physics.velocityFromRotation(angle, bullet.speed, bullet.body.velocity);
      }
      if (this.scene.time.now >= bullet.expiresAt) bullet.destroy();
    });
  }

  fire(aimX, aimY, options = {}) {
    const state = this.scene.state;
    const weapon = state.weapon;
    const baseAngle = Math.atan2(aimY, aimX);
    const count = options.projectiles || upgradedProjectileCount(
      weapon.projectiles,
      state.mods.projectilesAdd || 0,
      state.flags.fusillade,
    );
    const spreadMultiplier = 1 + (state.mods.spreadMul || 0);
    const spread = Math.max(0, weapon.spread * spreadMultiplier + (state.mods.spreadAdd || 0));
    const freshBoost = state.freshShots > 0 ? 1.6 : 1;
    const chargeBoost = 1 + (weapon.chargeDamageMax || 0) * state.weaponCharge;
    const shotSpec = {
      damage: weapon.damage * state.multiplierStats.damage * freshBoost * chargeBoost,
      speed: weapon.projectileSpeed * state.multiplierStats.projectileSpeed,
      life: weapon.projectileLife,
      pierce: weapon.pierce + (state.mods.pierceAdd || 0),
      bounces: state.mods.bounceAdd || 0,
      knockback: weapon.knockback * state.multiplierStats.knockback,
      size: weapon.bulletSize * state.multiplierStats.bulletSize,
      burnChance: Math.max(weapon.burnChance || 0, state.flags.burnChanceAdd || 0),
      burnDps: weapon.burnDps || 3,
      texture: weapon.projectileTexture,
    };
    for (let index = 0; index < count; index += 1) {
      const centered = count === 1 ? 0 : index / (count - 1) - .5;
      const random = count === 1 ? Phaser.Math.FloatBetween(-.5, .5) : 0;
      const angle = baseAngle + Phaser.Math.DegToRad((centered + random * .3) * spread);
      this.spawnBullet(this.scene.player.x + aimX * 26, this.scene.player.y + aimY * 26, angle, shotSpec);
    }
    if (state.flags.backShot) {
      this.spawnBullet(this.scene.player.x - aimX * 22, this.scene.player.y - aimY * 22, baseAngle + Math.PI, {
        ...shotSpec, damage: shotSpec.damage * .65,
      });
    }
    state.shots += 1;
    const moving = Math.hypot(this.scene.lastInput?.moveX || 0, this.scene.lastInput?.moveY || 0) > .2;
    const consumedAmmo = shouldConsumeAmmo({ free: options.free, siege: state.flags.siege, moving });
    state.ammo -= consumedAmmo ? 1 : 0;
    if (consumedAmmo && state.ammo === 0 && state.flags.fanFire) this.fanFire(shotSpec);
    if (state.freshShots > 0) state.freshShots -= 1;
    this.nextShotAt = this.scene.time.now + state.fireDelayMs;
    this.scene.onShot(baseAngle);
    if (state.hero.passive === 'fireWave') {
      const cadence = state.flags.rapidFireWave ? 2 : 3;
      if (state.shots % cadence === 0) this.fireWave(baseAngle);
    }
    if (state.hero.passive === 'reroll' && state.flags.nyraEcho && state.shots % 3 === 0) {
      [-.16, .16].forEach((offset) => this.spawnBullet(this.scene.player.x, this.scene.player.y, baseAngle + offset, {
        damage: weapon.damage * state.multiplierStats.damage * .8,
        speed: weapon.projectileSpeed * state.multiplierStats.projectileSpeed,
        life: weapon.projectileLife, pierce: 0, knockback: weapon.knockback,
        size: weapon.bulletSize, texture: weapon.projectileTexture,
      }));
    }
    if (state.flags.guaranteedLightning && state.shots % state.flags.guaranteedLightning === 0) {
      const target = this.scene.nearestEnemy(this.scene.player.x, this.scene.player.y, 520);
      if (target) this.lightning(target);
    }
    if (state.ammo <= 0) this.startReload();
  }

  spawnBullet(x, y, angle, spec = {}) {
    const bullet = this.scene.bullets.create(x, y, spec.texture || 'bullet');
    if (!bullet) return null;
    const speed = spec.speed || 620;
    bullet.setDepth(30).setScale((spec.size || 7) / 8).setRotation(angle);
    bullet.damage = spec.damage || 1;
    bullet.pierce = spec.pierce || 0;
    bullet.bounces = spec.bounces || 0;
    bullet.knockback = spec.knockback || 0;
    bullet.burnChance = spec.burnChance || 0;
    bullet.burnDps = spec.burnDps || 3;
    bullet.speed = speed;
    bullet.expiresAt = this.scene.time.now + (spec.life || 1) * 1000;
    bullet.hitTargets = new Set();
    this.scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    bullet.body.setCircle(4);
    return bullet;
  }

  startReload() {
    const state = this.scene.state;
    if (state.reloading || state.ammo >= state.magazine) return;
    state.reloading = true;
    state.reloadProgress = 0;
  }

  finishReload() {
    const state = this.scene.state;
    state.reloading = false;
    state.reloadProgress = 0;
    state.ammo = state.magazine;
    if (state.flags.freshClip) state.freshShots = 4;
  }

  fanFire(spec) {
    for (let index = 0; index < 10; index += 1) {
      this.spawnBullet(this.scene.player.x, this.scene.player.y, index / 10 * Math.PI * 2, {
        ...spec, damage: spec.damage * .15, speed: spec.speed * .82,
        life: Math.min(.8, spec.life), pierce: 0, size: Math.max(5, spec.size * .72),
      });
    }
    this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 0, .8);
  }

  hitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || bullet.hitTargets.has(enemy.spawnId)) return;
    bullet.hitTargets.add(enemy.spawnId);
    const impactX = enemy.x;
    const impactY = enemy.y;
    let damage = bullet.damage;
    if (Math.random() < (this.scene.state.mods.critChanceAdd || 0)) damage *= 2;
    if (this.scene.state.flags.execute && enemy.hp / enemy.maxHp <= this.scene.state.flags.execute) damage = enemy.hp + 1;
    this.damageEnemy(enemy, damage, { bullet });
    if (enemy.active && bullet.burnChance && Math.random() < bullet.burnChance) this.applyBurn(enemy, bullet.burnDps);
    if (enemy.active && Math.random() < (this.scene.state.flags.freezeChanceAdd || 0)) this.applyFreeze(enemy);
    if (enemy.active && Math.random() < (this.scene.state.flags.lightningChanceAdd || 0)) this.lightning(enemy);
    if (Math.random() < (this.scene.state.flags.explosionChanceAdd || 0)) this.explode(impactX, impactY, bullet.damage * .55);
    if (enemy.active && enemy.body?.velocity && bullet.active && bullet.body?.velocity && bullet.knockback) {
      const velocity = bullet.body.velocity.clone().normalize().scale(bullet.knockback);
      enemy.knockbackVelocity = velocity;
      enemy.knockbackUntil = this.scene.time.now + clamp(100 + bullet.knockback * .55, 115, 180);
      enemy.body.velocity.add(velocity);
      this.scene.flashEffect(impactX, impactY, 1, .28);
    }
    this.finishBulletHit(bullet);
  }

  finishBulletHit(bullet) {
    if (!bullet?.active) return;
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else if (!this.redirectRicochet(bullet)) bullet.destroy();
  }

  redirectRicochet(bullet) {
    if (!bullet.bounces) return false;
    let target = null;
    let bestDistance = 520;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || bullet.hitTargets.has(enemy.spawnId)) return;
      const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y);
      if (distance < bestDistance) { target = enemy; bestDistance = distance; }
    });
    if (!target) return false;
    bullet.bounces -= 1;
    bullet.damage *= 1.12;
    const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
    bullet.setRotation(angle);
    this.scene.physics.velocityFromRotation(angle, bullet.speed, bullet.body.velocity);
    bullet.expiresAt = Math.max(bullet.expiresAt, this.scene.time.now + 420);
    this.scene.flashEffect(bullet.x, bullet.y, 4, .24);
    return true;
  }

  damageEnemy(enemy, amount, source = {}) {
    if (!enemy?.active) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) this.killEnemy(enemy, source);
  }

  applyBurn(enemy, burnDps = 3) {
    enemy.status.burnUntil = Math.max(enemy.status.burnUntil, this.scene.time.now + 3200);
    enemy.status.burnDamage = burnDps * .5 * this.scene.state.multiplierStats.burnDamage;
    this.scene.flashEffect(enemy.x, enemy.y, 2, .26);
  }

  applyFreeze(enemy) {
    const duration = 1200 * (1 + (this.scene.state.flags.freezeDurationMul || 0));
    const newlyFrozen = enemy.status.freezeUntil < this.scene.time.now;
    enemy.status.freezeUntil = this.scene.time.now + duration;
    if (newlyFrozen && this.scene.state.flags.frostbite) {
      this.damageEnemy(enemy, enemy.hp * this.scene.state.flags.frostbite, { frostbite: true });
      if (!enemy.active) return;
    }
    enemy.setTint(0x8eeeff);
  }

  lightning(enemy) {
    if (!enemy?.active) return;
    const damage = 14 * this.scene.state.multiplierStats.lightningDamage;
    let x = enemy.x;
    let y = enemy.y;
    this.damageEnemy(enemy, damage, { lightning: true });
    this.scene.flashEffect(x, y, 4);
    let previous = enemy;
    const chains = 1 + (this.scene.state.flags.lightningChainsAdd || 0);
    for (let index = 0; index < chains; index += 1) {
      const current = this.scene.nearestEnemy(x, y, 150, previous);
      if (!current) break;
      x = current.x;
      y = current.y;
      this.damageEnemy(current, damage * .7, { lightning: true });
      previous = current;
    }
  }

  explode(x, y, damage, radius = 90) {
    const actualRadius = radius * this.scene.state.multiplierStats.explosionRadius;
    this.scene.flashEffect(x, y, 2, actualRadius / 55);
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (enemy?.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= actualRadius) {
        this.damageEnemy(enemy, damage * this.scene.state.multiplierStats.explosionDamage, { explosion: true });
      }
    });
  }

  fireWave(angle) {
    for (let index = -2; index <= 2; index += 1) {
      this.spawnBullet(this.scene.player.x, this.scene.player.y, angle + index * .13, {
        damage: this.scene.state.weapon.damage * .7, speed: 420, life: .7,
        pierce: 1, size: 12, burnChance: 1, burnDps: 3, texture: 'bullet-flame',
      });
    }
  }

  killEnemy(enemy, source = {}) {
    if (!enemy.active || enemy.dying) return;
    enemy.dying = true;
    const definition = enemy.enemyDef;
    if (definition.boss) {
      this.scene.state.bosses += 1;
      this.scene.loot.dropChest(enemy.x, enemy.y, this.scene.state.hero.chest);
      if (this.scene.activeBoss === enemy) this.scene.activeBoss = null;
    } else {
      this.scene.state.kills += 1;
      this.scene.loot.dropGem(enemy.x, enemy.y, definition.xp || 1);
      if (source.burn) {
        this.scene.state.burnKills += 1;
        const threshold = this.scene.state.hero.id === 'sola' ? 60 : 80;
        if (this.scene.state.flags.burnHeal && this.scene.state.burnKills % threshold === 0) {
          this.scene.state.heal(1);
          this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 5, .8);
        }
      }
    }
    this.scene.runScore += definition.score || 0;
    if (definition.splits) {
      for (let index = 0; index < 2; index += 1) {
        const point = { x: enemy.x + Phaser.Math.Between(-24, 24), y: enemy.y + Phaser.Math.Between(-24, 24) };
        this.scene.spawner.spawnEnemy(this.scene.enemyDefinitions.creeper, point);
      }
    }
    if (this.scene.state.flags.splinter && !definition.boss) {
      for (let index = 0; index < 3; index += 1) this.spawnBullet(enemy.x, enemy.y, Math.random() * Math.PI * 2, {
        damage: this.scene.state.weapon.damage * .45, speed: 430, life: .55,
        size: 5, texture: this.scene.state.weapon.projectileTexture,
      });
    }
    if (source.bullet && this.scene.state.hero.passive === 'shadow') {
      const chance = this.scene.state.flags.shadowChance || .18;
      if (Math.random() < chance) {
        const target = this.scene.nearestEnemy(enemy.x, enemy.y, 480, enemy);
        if (target) {
          const bolt = this.spawnBullet(enemy.x, enemy.y, 0, {
            damage: 18 * this.scene.state.multiplierStats.damage,
            speed: 420, life: 1.4, pierce: 1, size: 8, texture: 'bullet-spirit',
          });
          if (bolt) bolt.homingTarget = target;
        }
      }
    }
    if (enemy.status.burnUntil > this.scene.time.now && this.scene.state.flags.burnExplosion) this.explode(enemy.x, enemy.y, 18, 72);
    if (enemy.status.freezeUntil > this.scene.time.now && this.scene.state.flags.shatter) this.explode(enemy.x, enemy.y, 24, 85);
    this.scene.flashEffect(enemy.x, enemy.y, 1, definition.boss ? 1.8 : .65);
    enemy.destroy();
  }
}
