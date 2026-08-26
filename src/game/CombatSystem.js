import { clamp } from './simulation.js?build=20260825r';
import { CombatEffects } from './CombatEffects.js?build=20260826f';
import { handleSpecialKill } from './KillProgression.js?build=20260825r';
import { shouldConsumeAmmo, upgradedProjectileCount } from './WeaponMechanics.js?build=20260825r';
import { presentWeaponImpact, updateProjectilePresentation } from './WeaponPresentation.js?build=20260826g';

export const PROJECTILE_RENDER_MULTIPLIER = 1.45;

export function projectileScale(size = 7) {
  return size / 8 * PROJECTILE_RENDER_MULTIPLIER;
}

export function projectileCollisionRadius(size = 7) {
  return size / 2;
}

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.nextShotAt = 0;
    this.effects = new CombatEffects(scene, this);
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
      updateProjectilePresentation(this.scene, bullet);
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
    const freshBoost = state.elapsed < state.freshUntil ? 1.3 : 1;
    const chargeBoost = 1 + (weapon.chargeDamageMax || 0) * state.weaponCharge;
    const dragonBoost = state.flags.dragonBond ? (state.dragonDamage || 0) * .1 : 0;
    const shotSpec = {
      damage: weapon.damage * state.multiplierStats.damage * freshBoost * chargeBoost + dragonBoost,
      speed: weapon.projectileSpeed * state.multiplierStats.projectileSpeed,
      life: weapon.projectileLife,
      pierce: weapon.pierce + (state.mods.pierceAdd || 0),
      bounces: state.mods.bounceAdd || 0,
      knockback: weapon.knockback * state.multiplierStats.knockback,
      size: weapon.bulletSize * state.multiplierStats.bulletSize,
      burnChance: Math.min(1, (weapon.burnChance || 0) + (state.flags.burnChanceAdd || 0)),
      burnDps: weapon.burnDps || 3,
      freezeChance: state.flags.freezeChanceAdd || 0,
      curseChance: state.flags.curseChanceAdd || 0,
      texture: weapon.projectileTexture,
      weaponId: weapon.id,
    };
    const shotAngles = [];
    for (let index = 0; index < count; index += 1) {
      const centered = count === 1 ? 0 : index / (count - 1) - .5;
      const random = count === 1 ? Phaser.Math.FloatBetween(-.5, .5) : 0;
      const angle = baseAngle + Phaser.Math.DegToRad((centered + random * .3) * spread);
      shotAngles.push(angle);
      this.spawnBullet(this.scene.player.x + aimX * 26, this.scene.player.y + aimY * 26, angle, shotSpec);
    }
    if (state.flags.backShot) {
      this.spawnBullet(this.scene.player.x - aimX * 22, this.scene.player.y - aimY * 22, baseAngle + Math.PI, {
        ...shotSpec,
      });
    }
    state.shots += 1;
    const moving = Math.hypot(this.scene.lastInput?.moveX || 0, this.scene.lastInput?.moveY || 0) > .2;
    const consumedAmmo = shouldConsumeAmmo({ free: options.free, siege: state.flags.siege, moving });
    state.ammo -= consumedAmmo ? 1 : 0;
    if (consumedAmmo && state.ammo === 0 && state.flags.fanFire) this.fanFire(shotSpec);
    this.nextShotAt = this.scene.time.now + state.fireDelayMs;
    this.scene.onShot(baseAngle, { shotAngles });
    if (state.flags.electroCadence && state.shots % state.flags.electroCadence === 0) {
      const target = this.scene.nearestEnemy(this.scene.player.x, this.scene.player.y, 540);
      if (target) this.effects.lightning(target);
    }
    if (state.flags.fireballCadence && state.shots % state.flags.fireballCadence === 0) this.effects.fireball(baseAngle);
    if (state.hero.passive === 'fireWave' && state.shots % 3 === 0) this.fireWave(baseAngle);
    if (consumedAmmo && state.ammo === 0 && state.flags.iceShard) this.effects.iceShards(baseAngle);
    if (consumedAmmo && state.ammo === 0 && state.flags.smite) this.effects.smite();
    if (state.ammo <= 0) this.startReload();
  }

  spawnBullet(x, y, angle, spec = {}) {
    const bullet = this.scene.bullets.create(x, y, spec.texture || 'bullet');
    if (!bullet) return null;
    const speed = spec.speed || 620;
    bullet.setDepth(30).setScale(projectileScale(spec.size)).setRotation(angle);
    bullet.damage = spec.damage || 1;
    bullet.pierce = spec.pierce || 0;
    bullet.bounces = spec.bounces || 0;
    bullet.knockback = spec.knockback || 0;
    bullet.burnChance = spec.burnChance || 0;
    bullet.burnDps = spec.burnDps || 3;
    bullet.freezeChance = spec.freezeChance || 0;
    bullet.curseChance = spec.curseChance || 0;
    bullet.explosionDamage = spec.explosionDamage || 0;
    bullet.fireball = Boolean(spec.fireball);
    bullet.summon = Boolean(spec.summon);
    bullet.weaponId = spec.weaponId || null;
    bullet.speed = speed;
    bullet.expiresAt = this.scene.time.now + (spec.life || 1) * 1000;
    bullet.hitTargets = new Set();
    if (bullet.burnChance) bullet.setTint(0xffa34f).setBlendMode(Phaser.BlendModes.ADD);
    this.applyLens(bullet, angle);
    this.scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    bullet.body.setCircle(projectileCollisionRadius(spec.size) / projectileScale(spec.size));
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
    if (state.flags.freshClip) state.freshUntil = state.elapsed + 1;
    state.killClipStacks = 0;
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
    presentWeaponImpact(this.scene, bullet, impactX, impactY);
    let damage = bullet.damage;
    if (Math.random() < (this.scene.state.mods.critChanceAdd || 0)) damage *= 2;
    if (bullet.summon && this.scene.state.flags.summonExecute && !enemy.enemyDef.boss
      && Math.random() < this.scene.state.flags.summonExecute) damage = enemy.hp + 1;
    if (this.scene.state.flags.execute && enemy.hp / enemy.maxHp <= this.scene.state.flags.execute) damage = enemy.hp + 1;
    const source = { bullet, summon: bullet.summon };
    this.damageEnemy(enemy, damage, source);
    if (enemy.active && bullet.burnChance && Math.random() < bullet.burnChance) this.effects.applyBurn(enemy, bullet.burnDps);
    if (enemy.active && bullet.freezeChance && Math.random() < bullet.freezeChance) this.effects.applyFreeze(enemy);
    if (enemy.active && bullet.summon && Math.random() < (this.scene.state.flags.summonLightning || 0)) {
      this.effects.lightning(enemy, { summon: true });
    }
    if (bullet.explosionDamage) this.effects.explode(impactX, impactY, bullet.explosionDamage, 90, source);
    if (bullet.fireball) this.effects.burnArea(impactX, impactY, 90, enemy);
    if (enemy.active && enemy.body?.velocity && bullet.active && bullet.body?.velocity && bullet.knockback) {
      const velocity = bullet.body.velocity.clone().normalize().scale(bullet.knockback);
      enemy.knockbackVelocity = velocity;
      enemy.knockbackUntil = this.scene.time.now + clamp(100 + bullet.knockback * .55, 115, 180);
      enemy.body.velocity.add(velocity);
    }
    if (!enemy.active && this.scene.state.flags.pierceKilled) bullet.pierce += 1;
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

  applyLens(bullet, angle) {
    const lens = this.scene.magicLens;
    if (!lens?.active || !this.scene.state.flags.magicLens) return;
    const lensAngle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, lens.x, lens.y);
    if (Math.abs(Phaser.Math.Angle.Wrap(angle - lensAngle)) > .3) return;
    const multiplier = this.scene.state.flags.lensDouble ? 1.6 : 1.3;
    bullet.damage *= multiplier;
    bullet.setScale(bullet.scaleX * multiplier);
    bullet.bounces += (this.scene.state.flags.lensBounceAdd || 0) * (this.scene.state.flags.lensDouble ? 2 : 1);
    if (this.scene.state.flags.lensBurn) bullet.burnChance = 1;
    bullet.setTint(0x8ffcff);
  }

  damageEnemy(enemy, amount, source = {}) {
    if (!enemy?.active) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) this.killEnemy(enemy, source);
  }

  fireWave(angle) {
    for (let index = -2; index <= 2; index += 1) {
      this.spawnBullet(this.scene.player.x, this.scene.player.y, angle + index * .13, {
        damage: this.scene.state.weapon.damage * .7, speed: 420, life: .7,
        pierce: 1, size: 12, burnChance: 1, burnDps: 3, texture: 'bullet-flame', weaponId: 'flame',
      });
    }
  }

  killEnemy(enemy, source = {}) {
    if (!enemy.active || enemy.dying) return;
    enemy.dying = true;
    const definition = enemy.enemyDef;
    if (definition.boss) {
      this.scene.state.bosses += 1;
      this.scene.loot.dropBossReward(enemy.x, enemy.y, definition.rewardType);
      if (definition.id === 'shub') this.scene.barrier?.deactivate();
      if (this.scene.activeBoss === enemy) this.scene.activeBoss = null;
    } else {
      this.scene.state.kills += 1;
      this.scene.loot.dropGem(enemy.x, enemy.y, definition.xp || 1);
      handleSpecialKill(this.scene, definition, source);
    }
    this.scene.runScore += definition.score || 0;
    if (this.scene.state.flags.splinter && !definition.boss) {
      for (let index = 0; index < 3; index += 1) this.spawnBullet(enemy.x, enemy.y, Math.random() * Math.PI * 2, {
        damage: this.scene.state.weapon.damage * .15, speed: 430, life: .55,
        size: 5, texture: this.scene.state.weapon.projectileTexture,
      });
    }
    if (enemy.status.freezeUntil > this.scene.time.now && this.scene.state.flags.shatter) {
      this.effects.explode(enemy.x, enemy.y, enemy.maxHp * .25, 85);
    }
    this.scene.flashEffect(enemy.x, enemy.y, 1, definition.boss ? 1.8 : .65);
    enemy.boomerTell?.destroy();
    if (this.scene.spawner?.releaseEnemy) this.scene.spawner.releaseEnemy(enemy);
    else enemy.destroy();
  }
}
