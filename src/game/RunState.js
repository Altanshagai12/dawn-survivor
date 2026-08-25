import { xpRequired } from './simulation.js';

const ADDITIVE_KEYS = new Set([
  'ammoAdd', 'bounceAdd', 'maxHpAdd', 'pierceAdd', 'projectilesAdd', 'spreadAdd',
  'lightningDamageAdd',
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
    this.owned = new Set();
    this.upgradeTimes = new Map();
    this.flags = {};
    this.mods = {};
    this.maxHp = hero.hp;
    this.hp = hero.hp;
    this.shieldReady = false;
    this.shieldCooldown = 0;
    this.ammo = weapon.magazine;
    this.reloading = false;
    this.reloadProgress = 0;
    this.rerolls = hero.passive === 'reroll' ? 1 : 0;
    this.freshUntil = 0;
    this.killClipStacks = 0;
    this.windStacks = 0;
    this.windTimer = 0;
    this.angerUntil = 0;
    this.regenerationTimer = 0;
    this.weaponCharge = 0;
    this.soulHearts = 0;
  }

  get multiplierStats() {
    const wind = this.windStacks * .1;
    const blessing = this.flags.divineBlessing && this.shieldReady ? .25 : 0;
    return {
      damage: 1 + (this.mods.damageMul || 0) + wind,
      fireRate: 1 + (this.mods.fireRateMul || 0) + (this.elapsed < this.angerUntil ? .5 : 0),
      reload: 1 + (this.mods.reloadMul || 0) + this.killClipStacks * .05 + blessing,
      projectileSpeed: 1 + (this.mods.projectileSpeedMul || 0),
      moveSpeed: 1 + (this.mods.moveSpeedMul || 0) + wind + blessing,
      xp: 1,
      pickup: 1,
      bulletSize: 1 + (this.mods.bulletSizeMul || 0),
      knockback: 1 + (this.mods.knockbackMul || 0),
      summonDamage: 1 + (this.mods.summonDamageMul || 0),
      summonRate: 1 + (this.mods.summonRateMul || 0),
      burnDamage: 1 + (this.mods.burnDamageMul || 0),
      lightningDamage: 1,
      lightningArea: 1 + (this.mods.lightningAreaMul || 0),
      explosionDamage: 1,
      explosionRadius: 1,
    };
  }

  get magazine() {
    const baseMultiplier = this.flags.baseAmmoMultiplier || 1;
    return Math.max(1, Math.round(this.weapon.magazine * baseMultiplier + (this.mods.ammoAdd || 0)));
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
    this.upgradeTimes.set(upgrade.id, this.elapsed);
    Object.entries(upgrade.mods || {}).forEach(([key, value]) => {
      if (key.endsWith('Mul') || ADDITIVE_KEYS.has(key)) this.mods[key] = (this.mods[key] || 0) + value;
    });
    Object.entries(upgrade.set || {}).forEach(([key, value]) => {
      if (key.endsWith('Add') && typeof value === 'number') this.flags[key] = (this.flags[key] || 0) + value;
      else this.flags[key] = value;
    });
    const hpDelta = upgrade.mods?.maxHpAdd || 0;
    if (hpDelta) {
      this.maxHp = Math.max(1, this.maxHp + hpDelta);
      this.hp = hpDelta > 0 ? Math.min(this.maxHp, this.hp + hpDelta) : Math.min(this.hp, this.maxHp);
    }
    if (upgrade.set?.holyShield) this.shieldReady = true;
    this.ammo = Math.min(this.ammo, this.magazine);
    return true;
  }

  gainXp(baseAmount) {
    this.xp += baseAmount;
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
      this.shieldCooldown = this.flags.stalwartShield ? 60 : 120;
      return { blocked: true, dead: false };
    }
    this.hp -= amount;
    if (this.flags.angerPoint) this.angerUntil = this.elapsed + 15;
    if (this.flags.inTheWind) { this.windStacks = 0; this.windTimer = 0; }
    return { blocked: false, dead: this.hp <= 0 };
  }

  tick(seconds) {
    this.elapsed += seconds;
    if (this.flags.inTheWind) {
      this.windTimer += seconds;
      while (this.windTimer >= 10) {
        this.windTimer -= 10;
        this.windStacks = Math.min(4, this.windStacks + 1);
      }
    }
    if (this.flags.regeneration && this.hp < this.maxHp) {
      this.regenerationTimer += seconds;
      if (this.regenerationTimer >= 90) {
        this.regenerationTimer -= 90;
        this.heal(1);
      }
    }
    if (this.shieldCooldown > 0) {
      this.shieldCooldown -= seconds;
      if (this.shieldCooldown <= 0) this.shieldReady = true;
    }
  }
}
