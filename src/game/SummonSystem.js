export class SummonSystem {
  constructor(scene) {
    this.scene = scene;
    this.objects = new Map();
    this.timers = {};
  }

  update(delta) {
    const { flags } = this.scene.state;
    if (flags.dragonEgg) this.updateDragon(delta);
    if (flags.ghostFriend) this.updateGhost(delta);
    if (flags.magicLens) this.updateLens();
    if (flags.magicScythe) this.updateScythe();
    if (flags.magicSpears) this.updateSpears();
    if (flags.electroBug) this.updateElectroBug(delta);
    if (flags.summonPulse) this.updatePulse(delta);
  }

  ensure(key, frame, scale = .42) {
    let image = this.objects.get(key);
    if (!image?.active) {
      image = this.scene.add.image(this.scene.player.x, this.scene.player.y, 'upgrade-icons', frame)
        .setDepth(29).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
      this.objects.set(key, image);
    }
    return image.setFrame(frame).setScale(scale);
  }

  updateDragon(delta) {
    const state = this.scene.state;
    const acquiredAt = state.upgradeTimes.get('dragon-1') || 0;
    const hatched = state.elapsed - acquiredAt >= 180;
    const dragon = this.ensure('dragon', hatched ? 21 : 20, hatched ? .48 : .4);
    dragon.setPosition(this.scene.player.x - 72, this.scene.player.y - 64 + Math.sin(state.elapsed * 2.4) * 7);
    const minutes = Math.floor(state.elapsed / 60);
    state.dragonDamage = 20 + (state.flags.agedDragon ? minutes * 15 : 0);
    if (!hatched) return;
    const trainedRate = 1 + (state.flags.trainedDragon ? minutes * .1 : 0);
    this.timers.dragon = (this.timers.dragon || 0) + delta;
    if (this.timers.dragon >= 1.25 / state.multiplierStats.summonRate / trainedRate) {
      this.timers.dragon = 0;
      this.fireSummon(dragon, state.dragonDamage, 1, { size: 11, texture: 'bullet-flame', burnChance: .2 });
    }
  }

  updateGhost(delta) {
    const state = this.scene.state;
    const ghost = this.ensure('ghost', state.flags.ghostBurn ? 26 : 24, .43);
    ghost.setPosition(this.scene.player.x + 70, this.scene.player.y - 52 + Math.sin(state.elapsed * 3.2) * 8);
    const friendRate = state.flags.ghostBestFriends ? state.multiplierStats.fireRate : 1;
    this.timers.ghost = (this.timers.ghost || 0) + delta;
    if (this.timers.ghost >= .7 / state.multiplierStats.summonRate / friendRate) {
      this.timers.ghost = 0;
      this.fireSummon(ghost, 8, 1 + (state.flags.ghostProjectilesAdd || 0), {
        pierce: 1, size: 7, burnChance: state.flags.ghostBurn ? 1 : 0, burnDps: 6,
      });
    }
  }

  updateLens() {
    const state = this.scene.state;
    const lens = this.ensure('lens', state.flags.lensDouble ? 31 : 28, state.flags.lensDouble ? .28 : .44);
    const angle = state.elapsed * 1.15;
    lens.setPosition(this.scene.player.x + Math.cos(angle) * 72, this.scene.player.y + Math.sin(angle) * 58)
      .setRotation(angle + Math.PI / 2);
    this.scene.magicLens = lens;
  }

  updateScythe() {
    const state = this.scene.state;
    const scythe = this.ensure('scythe', state.flags.scytheCurse ? 33 : 32, .46);
    const angle = state.elapsed * 2.9;
    scythe.setPosition(this.scene.player.x + Math.cos(angle) * 92, this.scene.player.y + Math.sin(angle) * 70)
      .setRotation(angle);
    let damage = 40 * state.multiplierStats.summonDamage;
    if (state.flags.scytheMoveScale) damage *= state.multiplierStats.moveSpeed;
    if (state.flags.scytheDamageScale) damage *= state.multiplierStats.damage;
    this.damageTouching(scythe, damage, 46, 'scythe', state.flags.scytheCurse);
  }

  updateSpears() {
    const state = this.scene.state;
    for (let index = 0; index < 2; index += 1) {
      const spear = this.ensure(`spear-${index}`, state.flags.spearSoulScale ? 39 : 36, .4);
      const angle = state.elapsed * 2 + index * Math.PI;
      spear.setPosition(this.scene.player.x + Math.cos(angle) * 62, this.scene.player.y + Math.sin(angle) * 50)
        .setRotation(angle + Math.PI / 2);
      let damage = 20 + (state.flags.spearHpScale ? state.maxHp * 10 : 0);
      if (state.flags.spearSoulScale) damage += state.totalSoulHearts * 15;
      this.damageTouching(spear, damage * state.multiplierStats.summonDamage, 34, `spear${index}`);
    }
  }

  updateElectroBug(delta) {
    const bug = this.ensure('electro-bug', 49, .34);
    const state = this.scene.state;
    const angle = -state.elapsed * 1.7;
    bug.setPosition(this.scene.player.x + Math.cos(angle) * 54, this.scene.player.y + Math.sin(angle) * 44);
    this.timers.bug = (this.timers.bug || 0) + delta;
    if (this.timers.bug >= 1.5 / state.multiplierStats.summonRate) {
      this.timers.bug = 0;
      let previous = null;
      for (let index = 0; index < 2; index += 1) {
        const target = this.scene.nearestEnemy(bug.x, bug.y, 420, previous);
        if (!target) break;
        this.scene.combat.effects.lightning(target, { summon: true });
        previous = target;
      }
    }
  }

  updatePulse(delta) {
    this.timers.pulse = (this.timers.pulse || 0) + delta;
    if (this.timers.pulse < 2) return;
    this.timers.pulse = 0;
    this.objects.forEach((summon) => {
      if (!summon?.active) return;
      this.scene.flashEffect(summon.x, summon.y, 6, .55);
      this.scene.combat.effects.explode(summon.x, summon.y, 50 * this.scene.state.multiplierStats.summonDamage, 100, { summon: true });
    });
  }

  fireSummon(source, damage, count, options = {}) {
    const target = this.scene.nearestEnemy(source.x, source.y, 500);
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(source.x, source.y, target.x, target.y);
    for (let index = 0; index < count; index += 1) {
      this.scene.combat.spawnBullet(source.x, source.y, angle + (index - (count - 1) / 2) * .13, {
        damage: damage * this.scene.state.multiplierStats.summonDamage,
        speed: 470, life: 1.2, size: 8, summon: true, ...options,
      });
    }
    this.scene.flashEffect(source.x, source.y, options.texture === 'bullet-flame' ? 2 : 7, .25);
  }

  damageTouching(source, damage, radius, key, curse = false) {
    const now = this.scene.time.now;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.getData(`${key}HitAt`) > now) return;
      if (Phaser.Math.Distance.Between(source.x, source.y, enemy.x, enemy.y) > radius) return;
      enemy.setData(`${key}HitAt`, now + 430);
      if (this.scene.state.flags.summonExecute && !enemy.enemyDef.boss && Math.random() < this.scene.state.flags.summonExecute) {
        this.scene.combat.damageEnemy(enemy, enemy.hp + 1, { summon: true });
      } else this.scene.combat.damageEnemy(enemy, damage, { summon: true });
      if (enemy.active && curse) this.scene.combat.effects.applyCurse(enemy, damage);
      if (enemy.active && this.scene.state.flags.summonBurn) this.scene.combat.effects.applyBurn(enemy, 3);
      if (enemy.active && Math.random() < (this.scene.state.flags.summonLightning || 0)) this.scene.combat.effects.lightning(enemy, { summon: true });
    });
  }
}
