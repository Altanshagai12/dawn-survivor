export class SummonSystem {
  constructor(scene) {
    this.scene = scene;
    this.objects = new Map();
    this.timers = {};
  }

  update(delta) {
    const { flags } = this.scene.state;
    if (flags.ghostFriend) this.updateGhost(delta);
    if (flags.magicDagger) this.updateDaggers(delta);
    if (flags.magicScythe) this.updateScythe();
    if (flags.electroBug) this.updateElectroBug(delta);
  }

  ensure(key, frame, scale = .42) {
    let image = this.objects.get(key);
    if (!image?.active) {
      image = this.scene.add.image(this.scene.player.x, this.scene.player.y, 'upgrade-icons', frame)
        .setDepth(29).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
      if (this.scene.state.skin) image.setTint(this.scene.state.skin.secondary).setAlpha(.88);
      this.objects.set(key, image);
    }
    return image.setFrame(frame).setScale(scale).setVisible(true);
  }

  updateGhost(delta) {
    const state = this.scene.state;
    const ghost = this.ensure('ghost', 12, .43);
    ghost.setPosition(this.scene.player.x + 70, this.scene.player.y - 52 + Math.sin(state.elapsed * 3.2) * 8);
    this.timers.ghost = (this.timers.ghost || 0) + delta;
    if (this.timers.ghost < .7 / state.multiplierStats.summonRate) return;
    this.timers.ghost = 0;
    const target = this.scene.nearestEnemy(ghost.x, ghost.y, 520);
    if (!target) return;
    const angle = state.flags.ghostSync && this.scene.lastInput
      ? Math.atan2(this.scene.lastInput.aimY, this.scene.lastInput.aimX)
      : Phaser.Math.Angle.Between(ghost.x, ghost.y, target.x, target.y);
    this.fireSummon(ghost, angle, 22, 1 + (state.flags.ghostProjectilesAdd || 0), { pierce: 1 });
  }

  updateDaggers(delta) {
    const state = this.scene.state;
    const count = state.flags.daggerCount || 1;
    for (let index = 0; index < count; index += 1) {
      const dagger = this.ensure(`dagger-${index}`, 16, .38);
      const angle = state.elapsed * 2.2 + index * Math.PI * 2 / count;
      dagger.setPosition(this.scene.player.x + Math.cos(angle) * 64, this.scene.player.y + Math.sin(angle) * 50)
        .setRotation(angle + Math.PI / 2);
    }
    this.timers.dagger = (this.timers.dagger || 0) + delta;
    if (this.timers.dagger < .78 / state.multiplierStats.summonRate) return;
    this.timers.dagger = 0;
    for (let index = 0; index < count; index += 1) {
      const dagger = this.objects.get(`dagger-${index}`);
      const target = this.scene.nearestEnemy(dagger.x, dagger.y, 540);
      if (!target) continue;
      const angle = Phaser.Math.Angle.Between(dagger.x, dagger.y, target.x, target.y);
      const bullet = this.fireSummon(dagger, angle, state.weapon.damage * state.multiplierStats.damage, 1, { pierce: 1 });
      if (bullet) bullet.homingTarget = target;
    }
  }

  updateScythe() {
    const state = this.scene.state;
    const scythe = this.ensure('scythe', 17, .46);
    const angle = state.elapsed * 2.9;
    scythe.setPosition(this.scene.player.x + Math.cos(angle) * 92, this.scene.player.y + Math.sin(angle) * 70)
      .setRotation(angle);
    this.damageTouching(scythe, state.weapon.damage * 3 * state.multiplierStats.damage
      * state.multiplierStats.summonDamage, 46, 'scythe');
  }

  updateElectroBug(delta) {
    const state = this.scene.state;
    const bug = this.ensure('electro-bug', 8, .34);
    const angle = -state.elapsed * 1.7;
    bug.setPosition(this.scene.player.x + Math.cos(angle) * 54, this.scene.player.y + Math.sin(angle) * 44);
    this.timers.bug = (this.timers.bug || 0) + delta;
    if (this.timers.bug < 1.5 / state.multiplierStats.summonRate) return;
    this.timers.bug = 0;
    const hit = new Set();
    for (let index = 0; index < 2; index += 1) {
      const target = this.scene.nearestEnemy(bug.x, bug.y, 440, [...hit][0] || null);
      if (!target || hit.has(target)) break;
      hit.add(target);
      this.scene.combat.effects.lightning(target, { summon: true });
    }
  }

  fireSummon(source, angle, damage, count, options = {}) {
    let first = null;
    for (let index = 0; index < count; index += 1) {
      const bullet = this.scene.combat.spawnBullet(source.x, source.y,
        angle + (index - (count - 1) / 2) * .13, {
          damage: damage * this.scene.state.multiplierStats.summonDamage,
          speed: 470, life: 1.2, size: 8, summon: true, texture: 'bullet-spirit',
          weaponId: this.scene.state.weapon.id, skin: this.scene.state.skin,
          sourceType: 'summon', ...options,
        });
      if (!first) first = bullet;
    }
    this.scene.flashEffect(source.x, source.y, 7, .25);
    this.scene.premiumVfx?.specialVolley('summon', angle);
    return first;
  }

  damageTouching(source, damage, radius, key) {
    const now = this.scene.time.now;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.getData(`${key}HitAt`) > now) return;
      if (Phaser.Math.Distance.Between(source.x, source.y, enemy.x, enemy.y) > radius) return;
      enemy.setData(`${key}HitAt`, now + 430);
      this.scene.combat.damageEnemy(enemy, damage, { summon: true });
      this.scene.premiumVfx?.specialAt('scythe', enemy.x, enemy.y, source.rotation || 0, .09);
      this.scene.weaponAudio?.playSpecial?.('scythe', this.scene.state.skin, this.scene.state);
    });
  }

  destroy() {
    this.objects.forEach((object) => object.destroy());
    this.objects.clear();
  }
}
