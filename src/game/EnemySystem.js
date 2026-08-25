import { BOSS_ATLASES, ENEMY_ATLASES } from '../config/assets.js';
import { ENEMIES } from '../data/enemies.js';
import { playDirectional } from './animations.js';
import { syncGroundShadow } from './VisualEffects.js';
import { syncWinglingFeedback, syncWinglingWarning } from './WinglingFeedback.js';

export const PLAYER_INVULNERABILITY_MS = 1300;
export const DAMAGE_SOURCE = Object.freeze({
  BOMBER: 'bomber-contact',
  ENEMY: 'enemy-contact',
  PROJECTILE: 'enemy-projectile',
  TREE: 'tree-contact',
  UNKNOWN: 'unknown',
});

export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.playerInvulnerableUntil = 0;
    scene.physics.add.overlap(scene.player, scene.enemies, (_player, enemy) => this.touchPlayer(enemy));
    scene.physics.add.overlap(scene.player, scene.enemyBullets, (_player, bullet) => {
      if (!bullet.active) return;
      bullet.destroy();
      this.damagePlayer(bullet.getData?.('damage') || 1, DAMAGE_SOURCE.PROJECTILE);
    });
  }

  update(deltaSeconds) {
    const now = this.scene.time.now;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.dying) return;
      const wingling = enemy.enemyDef.id === 'wingling';
      if (wingling) syncWinglingWarning(enemy, this.scene.cameras.main, now);
      if (enemy.spawnReadyAt > now) {
        enemy.setVelocity(0, 0).setAlpha(.78 + Math.sin(now * .02) * .12);
        if (wingling) syncWinglingFeedback(enemy, now);
        syncGroundShadow(enemy);
        return;
      }
      if (enemy.status.burnUntil > now && now >= enemy.status.burnTick) {
        enemy.status.burnTick = now + 500;
        this.scene.combat.damageEnemy(enemy, enemy.status.burnDamage || 2, { burn: true });
        if (!enemy.active) return;
        enemy.setTint(0xff7a4c);
      }
      if (enemy.status.curseAt && now >= enemy.status.curseAt) {
        const curseDamage = enemy.status.curseDamage || 1;
        enemy.status.curseAt = 0;
        this.scene.combat.damageEnemy(enemy, curseDamage, { curse: true });
        if (!enemy.active) return;
        this.scene.flashEffect(enemy.x, enemy.y, 6, .55);
      }
      if (enemy.status.freezeUntil <= now && enemy.status.burnUntil <= now && enemy.status.curseUntil <= now) enemy.clearTint();

      const dx = this.scene.player.x - enemy.x;
      const dy = this.scene.player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      const frozen = enemy.status.freezeUntil > now;
      const speed = enemy.speed * (frozen ? .22 : 1);
      if (enemy.knockbackVelocity && enemy.knockbackUntil > now) {
        enemy.setVelocity(enemy.knockbackVelocity.x, enemy.knockbackVelocity.y);
      } else if (enemy.enemyDef.boss) this.updateBoss(enemy, nx, ny, distance, speed, now);
      else this.updateRegular(enemy, nx, ny, distance, speed, now);
      if (!enemy.active) return;

      const atlas = enemy.enemyDef.boss ? BOSS_ATLASES[enemy.enemyDef.id] : ENEMY_ATLASES[enemy.enemyDef.id];
      playDirectional(enemy, atlas.key, enemy.body.velocity.x, enemy.body.velocity.y, true);
      enemy.setAlpha(wingling ? 1 : distance > 620 ? .72 : 1);
      if (wingling) syncWinglingFeedback(enemy, now);
      syncGroundShadow(enemy);
      if (distance > 1900 && !enemy.enemyDef.boss) enemy.destroy();
    });
    this.scene.enemyBullets.getChildren().forEach((bullet) => {
      if (bullet?.active && now >= bullet.expiresAt) bullet.destroy();
    });
  }

  updateRegular(enemy, nx, ny, distance, speed, now) {
    const def = enemy.enemyDef;
    if (def.ranged && distance < 480 && now >= enemy.nextAttack) {
      enemy.nextAttack = now + 2100;
      this.fireProjectile(enemy.x, enemy.y, nx, ny, 185, 1);
    }
    if (def.charger && now >= enemy.nextAttack) {
      enemy.nextAttack = now + 3200;
      enemy.chargeUntil = now + 620;
      enemy.chargeVector = { x: nx, y: ny };
    }
    if (enemy.chargeUntil > now) {
      enemy.setVelocity(enemy.chargeVector.x * speed * 3.6, enemy.chargeVector.y * speed * 3.6);
      return;
    }
    if (def.ranged && distance < 240) enemy.setVelocity(-nx * speed, -ny * speed);
    else enemy.setVelocity(nx * speed, ny * speed);
  }

  updateBoss(enemy, nx, ny, distance, speed, now) {
    const pattern = enemy.enemyDef.pattern;
    if (pattern === 'charge') {
      if (now >= enemy.nextAttack) {
        enemy.nextAttack = now + 2850;
        enemy.chargeUntil = now + 780;
        enemy.chargeVector = { x: nx, y: ny };
        this.scene.flashEffect(enemy.x, enemy.y, 0, 1.1);
      }
      const multiplier = enemy.chargeUntil > now ? 4.2 : 1;
      const vector = enemy.chargeUntil > now ? enemy.chargeVector : { x: nx, y: ny };
      enemy.setVelocity(vector.x * speed * multiplier, vector.y * speed * multiplier);
      return;
    }
    if (pattern === 'rings' && now >= enemy.nextAttack) {
      enemy.nextAttack = now + 3600;
      for (let index = 0; index < 14; index += 1) {
        const angle = index / 14 * Math.PI * 2;
        this.fireProjectile(enemy.x, enemy.y, Math.cos(angle), Math.sin(angle), 138, 1);
      }
      this.scene.cameras.main.shake(220, .004);
    }
    if (pattern === 'summon' && now >= enemy.nextAttack) {
      enemy.nextAttack = now + 4200;
      for (let index = 0; index < 5; index += 1) {
        const angle = index / 5 * Math.PI * 2 + now * .001;
        this.fireProjectile(enemy.x, enemy.y, Math.cos(angle), Math.sin(angle), 170, 1);
        this.scene.spawner.spawnEnemy(index % 2 ? ENEMIES.wingling : ENEMIES.creeper, {
          x: enemy.x + Math.cos(angle) * 90,
          y: enemy.y + Math.sin(angle) * 90,
        });
      }
    }
    enemy.setVelocity(nx * speed, ny * speed);
  }

  fireProjectile(x, y, nx, ny, speed, damage) {
    const bullet = this.scene.enemyBullets.create(x, y, 'enemy-bullet');
    if (!bullet) return;
    const angle = Math.atan2(ny, nx);
    bullet.setDepth(28)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setData('damage', damage);
    bullet.expiresAt = this.scene.time.now + 5200;
    bullet.body.setCircle(5, 11, 5);
    bullet.setVelocity(nx * speed, ny * speed);
  }

  touchPlayer(enemy) {
    if (!enemy.active || this.scene.time.now < (enemy.spawnReadyAt || 0)
      || this.scene.time.now < (enemy.nextContactAt || 0)) return;
    enemy.nextContactAt = this.scene.time.now + 700;
    const bomber = enemy.enemyDef.bomber;
    this.damagePlayer(
      enemy.enemyDef.damage || 1,
      bomber ? DAMAGE_SOURCE.BOMBER : DAMAGE_SOURCE.ENEMY,
    );
    if (bomber) {
      this.scene.flashEffect(enemy.x, enemy.y, 2, 1.25);
      this.scene.combat.killEnemy(enemy, { explosion: true });
      return;
    }
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
    this.scene.physics.velocityFromRotation(angle, 190, this.scene.player.body.velocity);
  }

  damagePlayer(amount, source = DAMAGE_SOURCE.UNKNOWN) {
    const now = this.scene.time.now;
    if (now < this.playerInvulnerableUntil || this.scene.ended) return false;
    const moving = Math.hypot(this.scene.lastInput?.moveX || 0, this.scene.lastInput?.moveY || 0) > .2;
    const dodge = (this.scene.state.flags.dodgeAdd || 0)
      + (moving ? this.scene.state.flags.dodgeChance || 0 : 0)
      + (this.scene.state.flags.reflex ? Math.max(0, this.scene.state.multiplierStats.moveSpeed - 1) : 0);
    if (Math.random() < dodge) {
      this.scene.ui.toast('DODGE');
      return false;
    }
    const result = this.scene.state.takeDamage(amount);
    this.lastDamageSource = source;
    this.playerInvulnerableUntil = now + PLAYER_INVULNERABILITY_MS;
    this.invulnerabilityTween?.stop();
    this.invulnerabilityTween = this.scene.tweens.add({
      targets: this.scene.player,
      alpha: .32,
      duration: 110,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.scene.player?.active && this.scene.player.setAlpha(1),
    });
    this.scene.player
      .setTint(result.soul ? 0xa881ff : result.blocked ? 0x65e6ff : 0xffffff)
      .setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(120, () => this.scene.player?.active && this.scene.player.clearTint());
    this.scene.cameras.main.shake(180, result.blocked ? .003 : .009);
    if (result.soul && this.scene.state.flags.soulLink) {
      this.scene.enemies.getChildren().forEach((enemy) => {
        if (enemy?.active && !enemy.enemyDef.boss) this.scene.combat.damageEnemy(enemy, enemy.maxHp * .8, { soul: true });
      });
      this.scene.flashEffect(this.scene.player.x, this.scene.player.y, 6, 1.4);
    }
    if (result.blocked && this.scene.state.flags.shieldBurst) {
      this.scene.combat.effects.explode(this.scene.player.x, this.scene.player.y, 40, 115);
    }
    if (result.dead) this.scene.endRun(false);
    return true;
  }
}
