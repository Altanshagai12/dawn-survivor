import { clamp } from './simulation.js?build=20260825r';
import { CombatEffects } from './CombatEffects.js?build=20260828e';
import { handleSpecialKill } from './KillProgression.js?build=20260825r';
import { resolveProjectileLaunchHits, resolveProjectileTravelHits } from './ProjectileLaunchCollision.js?build=20260827e';
import { shouldConsumeAmmo, upgradedProjectileCount } from './WeaponMechanics.js?build=20260825r';
import { presentWeaponImpact, updateProjectilePresentation } from './WeaponPresentation.js?build=20260902e';
import { syncWeaponSkin } from './SkinPresentation.js?build=20260902e';
import { skinProjectileTint } from '../data/skins.js?build=20260901e';
import {
  PROJECTILE_RENDER_MULTIPLIER, PROJECTILE_HIT_RADIUS_MULTIPLIER, projectileBodyGeometry, projectileBodyRadius,
  projectileCollisionRadius, projectileScale, syncProjectileVisualRotation, usesSweptProjectileCollision,
  visibleProjectileCollisionRadius,
} from './ProjectileGeometry.js?build=20260903c';

export {
  PROJECTILE_RENDER_MULTIPLIER, PROJECTILE_HIT_RADIUS_MULTIPLIER, projectileBodyGeometry, projectileBodyRadius,
  projectileCollisionRadius, projectileScale, syncProjectileVisualRotation, usesSweptProjectileCollision,
  visibleProjectileCollisionRadius,
};

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
        syncProjectileVisualRotation(bullet, angle);
        this.scene.physics.velocityFromRotation(angle, bullet.speed, bullet.body.velocity);
      }
      if (bullet.sweptCollision) {
        resolveProjectileTravelHits(this, bullet, bullet.previousX, bullet.previousY, bullet.x, bullet.y);
        if (!bullet.active) return;
      }
      bullet.previousX = bullet.x;
      bullet.previousY = bullet.y;
      updateProjectilePresentation(this.scene, bullet);
      if (this.scene.time.now >= bullet.expiresAt) bullet.destroy();
    });
  }

  fire(aimX, aimY, options = {}) {
    const state = this.scene.state;
    const weapon = state.weapon;
    const baseAngle = Math.atan2(aimY, aimX);
    syncWeaponSkin(this.scene.weaponSkin, this.scene.player, 0, baseAngle);
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
      // The held gun/muzzle is cosmetic. Every skin uses the original ballistic
      // origin per pellet, so hand poses and artwork cannot change hits or range.
      this.spawnBullet(this.scene.player.x + Math.cos(angle) * 26,
        this.scene.player.y + Math.sin(angle) * 26, angle, {
        ...shotSpec,
        launchOrigin: { x: this.scene.player.x, y: this.scene.player.y },
      });
    }
    if (state.flags.backShot) {
      const backAngle = baseAngle + Math.PI;
      this.spawnBullet(
        this.scene.player.x + Math.cos(backAngle) * 22,
        this.scene.player.y + Math.sin(backAngle) * 22,
        backAngle,
        {
          ...shotSpec, sourceType: 'rear', launchOrigin: { x: this.scene.player.x, y: this.scene.player.y },
        },
      );
      this.scene.premiumVfx?.specialVolley('rear', backAngle);
      this.scene.weaponAudio?.playSpecial?.('rear', state.skin, state);
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
    bullet.sourceType = spec.sourceType || (bullet.summon ? 'summon' : 'weapon');
    bullet.weaponId = spec.weaponId || null;
    bullet.trajectoryAngle = angle;
    bullet.visualRotationOffset = 0;
    bullet.skin = spec.skin === undefined && bullet.weaponId ? this.scene.state.skin : (spec.skin || null);
    bullet.sweptCollision = usesSweptProjectileCollision(bullet.weaponId);
    bullet.previousX = x;
    bullet.previousY = y;
    bullet.trajectoryRevision = 0;
    bullet.speed = speed;
    bullet.expiresAt = this.scene.time.now + (spec.life || 1) * 1000;
    bullet.hitTargets = new Set();
    if (bullet.burnChance) bullet.setTint(0xffa34f).setBlendMode(Phaser.BlendModes.ADD);
    const premiumTint = skinProjectileTint(bullet.skin, bullet.weaponId);
    if (premiumTint) bullet.setTint(premiumTint).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.premiumVfx?.styleProjectile(bullet, spec.size || 7, bullet.weaponId);
    this.applyLens(bullet, angle);
    this.scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    const frameWidth = bullet.frame?.realWidth || bullet.frame?.width || bullet.width || 0;
    const frameHeight = bullet.frame?.realHeight || bullet.frame?.height || bullet.height || frameWidth;
    const body = projectileBodyGeometry({
      size: spec.size,
      renderScale: bullet.scaleX,
      frameWidth,
      frameHeight,
      originX: bullet.originX,
      originY: bullet.originY,
    });
    bullet.collisionRadius = body.worldRadius;
    bullet.body.setCircle(body.localRadius, body.offsetX, body.offsetY);
    if (spec.launchOrigin) {
      resolveProjectileLaunchHits(this, bullet, spec.launchOrigin.x, spec.launchOrigin.y, x, y);
    }
    return bullet;
  }

  startReload() {
    const state = this.scene.state;
    if (state.reloading || state.ammo >= state.magazine) return;
    state.reloading = true;
    state.reloadProgress = 0;
    this.scene.premiumVfx?.reload('start');
    this.scene.weaponAudio?.playReload?.('start', state.weapon.id, state.skin, state);
  }

  finishReload() {
    const state = this.scene.state;
    state.reloading = false;
    state.reloadProgress = 0;
    state.ammo = state.magazine;
    if (state.flags.freshClip) state.freshUntil = state.elapsed + 1;
    state.killClipStacks = 0;
    this.scene.premiumVfx?.reload('complete');
    this.scene.weaponAudio?.playReload?.('complete', state.weapon.id, state.skin, state);
  }

  fanFire(spec) {
    this.scene.premiumVfx?.specialVolley('fan');
    this.scene.weaponAudio?.playSpecial?.('fan', this.scene.state.skin, this.scene.state);
    for (let index = 0; index < 10; index += 1) {
      this.spawnBullet(this.scene.player.x, this.scene.player.y, index / 10 * Math.PI * 2, {
        ...spec, damage: spec.damage * .15, speed: spec.speed * .82,
        life: Math.min(.8, spec.life), pierce: 0, size: Math.max(5, spec.size * .72), sourceType: 'fan',
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
    if (bullet.pierce > 0) {
      bullet.pierce -= 1;
      this.scene.weaponAudio?.playSpecial?.('pierce', bullet.skin, this.scene.state);
    }
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
    bullet.trajectoryRevision = Number(bullet.trajectoryRevision || 0) + 1;
    const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
    syncProjectileVisualRotation(bullet, angle);
    this.scene.physics.velocityFromRotation(angle, bullet.speed, bullet.body.velocity);
    bullet.expiresAt = Math.max(bullet.expiresAt, this.scene.time.now + 420);
    this.scene.premiumVfx?.ricochet(bullet);
    this.scene.weaponAudio?.playSpecial?.('ricochet', bullet.skin, this.scene.state);
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
    // Lens changes damage equally; a skin's visible core stays fitted to its
    // unchanged hitbox (the original projectile's visual behavior is retained).
    if (!bullet.skin) bullet.setScale(bullet.scaleX * multiplier);
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
    const definition = enemy.enemyDef;
    if (definition.id === 'boomer' && !source.boomerExplosion && !enemy.boomerExplosionStarted
      && this.scene.enemySystem?.explodeBoomer) {
      this.scene.enemySystem.explodeBoomer(enemy);
      return;
    }
    enemy.dying = true;
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
        weaponId: this.scene.state.weapon.id, skin: this.scene.state.skin, sourceType: 'splinter',
      });
      this.scene.premiumVfx?.specialVolley('splinter');
      this.scene.weaponAudio?.playSpecial?.('splinter', this.scene.state.skin, this.scene.state);
    }
    if (enemy.status.freezeUntil > this.scene.time.now && this.scene.state.flags.shatter) {
      this.effects.explode(enemy.x, enemy.y, enemy.maxHp * .25, 85, { shatter: true });
    }
    this.scene.flashEffect(enemy.x, enemy.y, 1, definition.boss ? 1.8 : .65);
    enemy.boomerTell?.destroy();
    if (this.scene.spawner?.releaseEnemy) this.scene.spawner.releaseEnemy(enemy);
    else enemy.destroy();
  }
}
