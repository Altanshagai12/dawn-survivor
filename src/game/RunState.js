import { xpRequired } from './simulation.js';

const ADDITIVE_KEYS = new Set([
  'ammoAdd', 'critChanceAdd', 'maxHpAdd', 'pierceAdd', 'spreadAdd',
]);

export class RunState {
  constructor(hero, weapon) {
    this.hero = hero;
    this.weapon = weapon;
    this.elapsed = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpRequired(1);
    this.kills = 0;
    this.bosses = 0;
    this.shots = 0;
    this.burnKills = 0;
    this.owned = new Set();
    this.flags = {};
    this.mods = {};
    this.maxHp = hero.hp;
    this.hp = hero.hp;
    this.shieldReady = false;
    this.shieldCooldown = 0;
    this.lastBreathUsed = false;
    this.ammo = weapon.magazine;
    this.reloading = false;
    this.reloadProgress = 0;
    this.rerolls = hero.passive === 'reroll' ? 1 : 0;
    this.freshShots = 0;
  }

  get multiplierStats() {
    return {
      damage: 1 + (this.mods.damageMul || 0) + (this.dynamicDamageMul || 0),
      fireRate: 1 + (this.mods.fireRateMul || 0) + (this.dynamicFireRateMul || 0),
      reload: 1 + (this.mods.reloadMul || 0),
      projectileSpeed: 1 + (this.mods.projectileSpeedMul || 0),
      moveSpeed: 1 + (this.mods.moveSpeedMul || 0),
      xp: 1 + (this.mods.xpMul || 0),
      pickup: 1 + (this.mods.pickupMul || 0),
      bulletSize: 1 + (this.mods.bulletSizeMul || 0),
      knockback: 1 + (this.mods.knockbackMul || 0),
      summonDamage: 1 + (this.mods.summonDamageMul || 0),
      summonRate: 1 + (this.mods.summonRateMul || 0),
      burnDamage: 1 + (this.mods.burnDamageMul || 0),
      lightningDamage: 1 + (this.mods.lightningDamageMul || 0),
      explosionDamage: 1 + (this.mods.explosionDamageMul || 0),
      explosionRadius: 1 + (this.mods.explosionRadiusMul || 0),
    };
  }

  get magazine() {
    const multiplier = 1 + (this.mods.ammoMul || 0);
    return Math.max(1, Math.round((this.weapon.magazine + (this.mods.ammoAdd || 0)) * multiplier));
  }

  get fireDelayMs() {
    return 1000 / Math.max(.1, this.weapon.fireRate * this.multiplierStats.fireRate);
  }

  get reloadMs() {
    return this.weapon.reload * 1000 / Math.max(.1, this.multiplierStats.reload);
  }

  get moveSpeed() {
    return this.hero.speed * this.multiplierStats.moveSpeed;
  }

  applyUpgrade(upgrade) {
    if (!upgrade || this.owned.has(upgrade.id)) return false;
    this.owned.add(upgrade.id);
    for (const [key, value] of Object.entries(upgrade.mods || {})) {
      if (key === 'heal') continue;
      if (key === 'sizeMul' || key.endsWith('Mul') || ADDITIVE_KEYS.has(key)) {
        this.mods[key] = (this.mods[key] || 0) + value;
      }
    }
    Object.assign(this.flags, upgrade.set || {});
    if (upgrade.mods?.maxHpAdd) {
      this.maxHp += upgrade.mods.maxHpAdd;
      this.hp += upgrade.mods.maxHpAdd;
    }
    if (upgrade.mods?.heal) this.heal(upgrade.mods.heal);
    if (upgrade.set?.shield) this.shieldReady = true;
    this.ammo = Math.min(this.ammo, this.magazine);
    return true;
  }

  gainXp(baseAmount) {
    this.xp += baseAmount * this.multiplierStats.xp;
    let gained = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      gained += 1;
      this.xpNext = xpRequired(this.level);
    }
    return gained;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeDamage(amount) {
    if (this.shieldReady) {
      this.shieldReady = false;
      this.shieldCooldown = Math.max(20, 90 + (this.flags.shieldRechargeAdd || 0));
      return { blocked: true, dead: false };
    }
    this.hp -= amount;
    if (this.hp <= 0 && this.flags.lastBreath && !this.lastBreathUsed) {
      this.lastBreathUsed = true;
      this.hp = Math.min(this.maxHp, 2);
    }
    if (this.hero.passive === 'rage') {
      const gain = this.flags.doubleRage ? .2 : .1;
      this.mods.fireRateMul = (this.mods.fireRateMul || 0) + gain;
      this.mods.reloadMul = (this.mods.reloadMul || 0) + gain;
    }
    return { blocked: false, dead: this.hp <= 0 };
  }

  tick(seconds) {
    this.elapsed += seconds;
    if (this.shieldCooldown > 0) {
      this.shieldCooldown -= seconds;
      if (this.shieldCooldown <= 0) this.shieldReady = true;
    }
  }
}
