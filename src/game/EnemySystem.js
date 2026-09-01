import { BOSS_ATLASES, ENEMY_ATLASES } from '../config/assets.js?build=20260825r';
import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260828i';
import { playDirectional } from './animations.js?build=20260828g';
import { restoreHeroSkin, setHeroSkinVisibility } from './SkinPresentation.js?build=20260901a';
import { syncGroundShadow } from './VisualEffects.js?build=20260825r';

export const PLAYER_INVULNERABILITY_MS = TEN_MINUTES_BALANCE.player.hitIFramesMs;
export const PLAYER_INVULNERABILITY_BLINK_MS = TEN_MINUTES_BALANCE.player.hitBlinkMs;
export const DAMAGE_SOURCE = Object.freeze({
  BOOMER: 'bomber-contact',
  ENEMY: 'enemy-contact',
  PROJECTILE: 'enemy-projectile',
  TREE: 'tree-contact',
  BARRIER: 'barrier-contact',
  UNKNOWN: 'unknown',
});

export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.playerInvulnerableUntil = 0;
    this.playerInvulnerableStartedAt = 0;
    this.steeringAt = 0;
    this.steering = new Map();
    scene.physics.add.overlap(scene.player, scene.enemies, (_player, enemy) => this.touchPlayer(enemy));
    scene.physics.add.overlap(scene.player, scene.enemyBullets, (_player, bullet) => {
      if (!bullet.active) return;
      bullet.destroy();
      this.damagePlayer(bullet.getData?.('damage') || 1, DAMAGE_SOURCE.PROJECTILE);
    });
  }

  update() {
    const now = this.scene.time.now;
    this.updatePlayerInvulnerability(now);
    if (now >= this.steeringAt) {
      this.steeringAt = now + 100;
      this.rebuildSteering();
    }
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.dying) return;
      this.updateStatuses(enemy, now);
      if (!enemy.active) return;
      const dx = this.scene.player.x - enemy.x;
      const dy = this.scene.player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      const frozen = enemy.status.freezeUntil > now;
      const speed = enemy.speed * (frozen ? .22 : 1);
      if (enemy.knockbackVelocity && enemy.knockbackUntil > now) {
        enemy.setVelocity(enemy.knockbackVelocity.x, enemy.knockbackVelocity.y);
      } else if (enemy.enemyDef.boss) this.updateBoss(enemy, nx, ny, speed, now);
      else this.updateRegular(enemy, nx, ny, distance, speed, now);
      if (!enemy.active) return;
      const atlas = enemy.enemyDef.boss ? BOSS_ATLASES[enemy.enemyDef.id] : ENEMY_ATLASES[enemy.enemyDef.id];
      const visualRange = this.scene.performance.mobile ? 720 : 1050;
      if (distance <= visualRange || enemy.enemyDef.boss) {
        playDirectional(enemy, atlas.key, enemy.body.velocity.x, enemy.body.velocity.y, true);
        enemy.groundShadow?.setVisible(true);
        syncGroundShadow(enemy);
      } else {
        enemy.anims?.stop();
        enemy.setFrame(24);
        enemy.groundShadow?.setVisible(false);
      }
      if (distance > 2300 && !enemy.enemyDef.boss) this.scene.spawner.releaseEnemy(enemy);
    });
    this.scene.enemyBullets.getChildren().forEach((bullet) => {
      if (bullet?.active && now >= bullet.expiresAt) bullet.destroy();
    });
  }

  rebuildSteering() {
    const active = this.scene.enemies.getChildren().filter((enemy) => enemy?.active && !enemy.dying);
    const cellSize = 86;
    const cells = new Map();
    active.forEach((enemy) => {
      const key = `${Math.floor(enemy.x / cellSize)}:${Math.floor(enemy.y / cellSize)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(enemy);
    });
    active.forEach((enemy) => {
      const cx = Math.floor(enemy.x / cellSize);
      const cy = Math.floor(enemy.y / cellSize);
      let x = 0;
      let y = 0;
      let checked = 0;
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const bucket = cells.get(`${cx + ox}:${cy + oy}`) || [];
        for (const other of bucket) {
          if (other === enemy || checked++ > 14) continue;
          const dx = enemy.x - other.x;
          const dy = enemy.y - other.y;
          const distance = Math.hypot(dx, dy) || 1;
          const desired = enemy.enemyDef.radius + other.enemyDef.radius + 8;
          if (distance < desired) {
            const strength = (desired - distance) / desired;
            x += dx / distance * strength;
            y += dy / distance * strength;
          }
        }
      }
      const tree = this.scene.obstacles?.avoidanceAt(enemy.x, enemy.y, enemy.enemyDef.radius + 12) || { x: 0, y: 0 };
      this.steering.set(enemy.spawnId, { x: x * .9 + tree.x * 1.5, y: y * .9 + tree.y * 1.5 });
    });
  }

  steeredVelocity(enemy, nx, ny, speed, multiplier = 1) {
    const steer = this.steering.get(enemy.spawnId) || { x: 0, y: 0 };
    const x = nx + steer.x;
    const y = ny + steer.y;
    const length = Math.hypot(x, y) || 1;
    enemy.setVelocity(x / length * speed * multiplier, y / length * speed * multiplier);
  }

  updateStatuses(enemy, now) {
    if (enemy.status.burnUntil > now && now >= enemy.status.burnTick) {
      enemy.status.burnTick = now + 500;
      this.scene.combat.damageEnemy(enemy, enemy.status.burnDamage || 1.5, { burn: true });
      if (enemy.active) {
        enemy.setTint(0xff7a38);
        this.scene.flashEffect(enemy.x, enemy.y - enemy.displayHeight * .08, 2,
          enemy.enemyDef.boss ? .3 : .2);
      }
    }
    if (enemy.active && enemy.status.freezeUntil > now) enemy.setTint(0x8eeeff);
    else if (enemy.active && enemy.status.burnUntil <= now) enemy.clearTint();
  }

  updateRegular(enemy, nx, ny, distance, speed, now) {
    if (enemy.enemyDef.id === 'boomer') {
      if (enemy.boomerExplodesAt && now >= enemy.boomerExplodesAt) { this.explodeBoomer(enemy); return; }
      if (!enemy.boomerExplodesAt && distance < 112) this.armBoomer(enemy, now);
      if (enemy.boomerExplodesAt) { enemy.setVelocity(0, 0); return; }
    }
    if (enemy.enemyDef.id === 'eye') {
      if (distance < 540 && now >= enemy.nextAttack) {
        enemy.nextAttack = now + 2100;
        this.fireProjectile(enemy.x, enemy.y, nx, ny);
      }
      if (distance < 230) this.steeredVelocity(enemy, -nx, -ny, speed);
      else if (distance > 315) this.steeredVelocity(enemy, nx, ny, speed);
      else enemy.setVelocity(0, 0);
      return;
    }
    this.steeredVelocity(enemy, nx, ny, speed);
  }

  armBoomer(enemy, now) {
    enemy.boomerExplodesAt = now + TEN_MINUTES_BALANCE.enemy.boomer.windupMs;
    const ring = this.scene.add.circle(
      enemy.x, enemy.y, TEN_MINUTES_BALANCE.enemy.boomer.blastRadius, 0xff5a52, .08,
    ).setDepth(18).setScale(.38).setStrokeStyle(3, 0xff765e, .85);
    enemy.boomerTell = ring;
    this.scene.tweens.add({ targets: ring, scale: 1, alpha: .24, duration: TEN_MINUTES_BALANCE.enemy.boomer.windupMs,
      onComplete: () => ring.destroy() });
  }

  explodeBoomer(enemy) {
    if (!enemy?.active || enemy.boomerExplosionStarted) return;
    enemy.boomerExplosionStarted = true;
    const blastRadius = TEN_MINUTES_BALANCE.enemy.boomer.blastRadius;
    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y) < 92) {
      this.damagePlayer(TEN_MINUTES_BALANCE.enemy.boomer.explosionDamage, DAMAGE_SOURCE.BOOMER);
    }
    (this.scene.enemies?.getChildren?.() || []).forEach((nearby) => {
      if (!nearby?.active || nearby === enemy || nearby.enemyDef?.boss) return;
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, nearby.x, nearby.y) <= blastRadius) {
        this.scene.combat.killEnemy(nearby, { explosion: true, friendlyFire: true });
      }
    });
    this.scene.flashEffect(enemy.x, enemy.y, 2, 1.3);
    this.scene.combat.killEnemy(enemy, { explosion: true, boomerExplosion: true });
  }

  updateBoss(enemy, nx, ny, speed, now) {
    if (enemy.enemyDef.id !== 'shub') { this.steeredVelocity(enemy, nx, ny, speed); return; }
    if (enemy.chargeUntil > now) {
      const chargeSpeed = this.scene.state.hero.speed * TEN_MINUTES_BALANCE.enemy.shub.chargeRatio;
      enemy.setVelocity(enemy.chargeVector.x * chargeSpeed, enemy.chargeVector.y * chargeSpeed);
      return;
    }
    if (enemy.chargePending && now >= enemy.telegraphUntil) {
      enemy.chargePending = false;
      enemy.chargeUntil = now + TEN_MINUTES_BALANCE.enemy.shub.chargeMs;
      return;
    }
    if (enemy.chargePending) { enemy.setVelocity(0, 0); return; }
    if (now >= enemy.nextAttack) {
      enemy.nextAttack = now + 3400;
      enemy.chargeVector = { x: nx, y: ny };
      enemy.telegraphUntil = now + TEN_MINUTES_BALANCE.enemy.shub.telegraphMs;
      enemy.chargePending = true;
      this.showChargeTell(enemy, nx, ny);
      enemy.setVelocity(0, 0);
      return;
    }
    this.steeredVelocity(enemy, nx, ny, speed);
  }

  showChargeTell(enemy, nx, ny) {
    const length = 620;
    const tell = this.scene.add.rectangle(enemy.x + nx * length / 2, enemy.y + ny * length / 2,
      length, 28, 0xb66cff, .18).setDepth(18).setRotation(Math.atan2(ny, nx))
      .setStrokeStyle(2, 0xd9a6ff, .8);
    this.scene.tweens.add({ targets: tell, alpha: .6, yoyo: true, repeat: 3,
      duration: TEN_MINUTES_BALANCE.enemy.shub.telegraphMs / 8, onComplete: () => tell.destroy() });
  }

  fireProjectile(x, y, nx, ny) {
    const bullet = this.scene.enemyBullets.create(x, y, 'enemy-bullet');
    if (!bullet) return;
    const speed = TEN_MINUTES_BALANCE.enemy.eye.projectileSpeed;
    bullet.setDepth(28).setScale(1.35).setRotation(Math.atan2(ny, nx))
      .setBlendMode(Phaser.BlendModes.ADD).setData('damage', 1);
    bullet.expiresAt = this.scene.time.now + 5200;
    bullet.body.setCircle(4, 12, 6);
    bullet.setVelocity(nx * speed, ny * speed);
  }

  touchPlayer(enemy) {
    if (!enemy.active || this.scene.time.now < (enemy.nextContactAt || 0)) return;
    enemy.nextContactAt = this.scene.time.now + 500;
    if (enemy.enemyDef.id === 'boomer') { if (!enemy.boomerExplodesAt) this.armBoomer(enemy, this.scene.time.now); return; }
    this.damagePlayer(enemy.enemyDef.damage || 1, DAMAGE_SOURCE.ENEMY);
  }

  isPlayerInvulnerable(now = this.scene.time.now) {
    return now < this.playerInvulnerableUntil;
  }

  updatePlayerInvulnerability(now = this.scene.time.now) {
    const invulnerable = this.isPlayerInvulnerable(now);
    this.scene.state.isInvincible = invulnerable;
    const elapsed = Math.max(0, now - this.playerInvulnerableStartedAt);
    const dimmed = invulnerable
      && Math.floor(elapsed / PLAYER_INVULNERABILITY_BLINK_MS) % 2 === 0;
    const visibility = dimmed ? .28 : 1;
    if (this.scene.player?.active) this.scene.player.setAlpha(visibility);
    setHeroSkinVisibility(this.scene.skinAura, visibility);
    this.scene.premiumVfx?.setPlayerVisibility?.(visibility);
    return invulnerable;
  }

  damagePlayer(amount, source = DAMAGE_SOURCE.UNKNOWN) {
    const now = this.scene.time.now;
    if (this.scene.ended || this.updatePlayerInvulnerability(now)) return false;
    const result = this.scene.state.takeDamage(amount);
    this.lastDamageSource = source;
    this.scene.ui.showDamageSource?.(source);
    this.playerInvulnerableStartedAt = now;
    this.playerInvulnerableUntil = now + PLAYER_INVULNERABILITY_MS;
    this.updatePlayerInvulnerability(now);
    this.scene.player.setTint(result.blocked ? 0x65e6ff : 0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(110, () => restoreHeroSkin(this.scene));
    if (!result.blocked) this.scene.weaponAudio?.playVoice('hurt', this.scene.state.skin);
    this.scene.cameras.main.shake(150, result.blocked ? .003 : .008);
    if (result.dead) this.scene.endRun(false);
    return true;
  }
}
