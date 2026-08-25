import { HERO_ATLASES } from '../config/assets.js';
import { ENEMIES, RUN_SECONDS } from '../data/enemies.js';
import { HEROES } from '../data/heroes.js';
import { eligibleUpgrades } from '../data/upgrades.js';
import { WEAPONS } from '../data/weapons.js';
import { CombatSystem } from './CombatSystem.js';
import { EnemySystem } from './EnemySystem.js';
import { InputController } from './InputController.js';
import { LootSystem } from './LootSystem.js';
import { RunState } from './RunState.js';
import { Spawner } from './Spawner.js';
import { SummonSystem } from './SummonSystem.js';
import { UpgradeEffectSystem } from './UpgradeEffectSystem.js';
import { WorldObstacleSystem } from './WorldObstacleSystem.js';
import { gameDeviceProfile } from './deviceProfile.js';
import { movementMultiplier } from './movement.js';
import {
  triggerShotFeedback, updateMovementFeedback, updateShotFeedback, updateWeaponCharge,
} from './PlayerFeedback.js';
import { facingVector, playDirectional } from './animations.js';
import { sampleWithoutReplacement, scoreForRun } from './simulation.js';
import {
  attachGroundShadow, createGameTextures, createPlayerLights, createReloadIndicator,
  syncGroundShadow, syncPlayerLights, syncReloadIndicator,
} from './VisualEffects.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(selection) {
    this.selection = selection;
    this.ended = false;
    this.choiceQueue = [];
    this.choiceOpen = false;
    this.runScore = 0;
    this.hudAccumulator = 0;
    this.regenAccumulator = 0;
    this.magnetAccumulator = 0;
    this.dustAccumulator = 0;
    this.facing = { x: 0, y: 1 };
    this.aimHoldUntil = 0;
    this.activeVfx = 0;
  }

  create() {
    this.ui = this.game.registry.get('ui');
    this.platform = this.game.registry.get('platform');
    this.profile = this.game.registry.get('profile');
    this.enemyDefinitions = ENEMIES;
    this.state = new RunState(HEROES[this.selection.heroId], WEAPONS[this.selection.weaponId]);
    this.performance = gameDeviceProfile({
      coarse: matchMedia('(pointer: coarse)').matches,
      width: this.scale.width,
      cores: navigator.hardwareConcurrency || 8,
      memory: navigator.deviceMemory || 8,
    });
    this.createWorld();
    createGameTextures(this);
    this.createGroups();
    this.createPlayer();
    this.inputController = new InputController(this);
    this.spawner = new Spawner(this);
    this.combat = new CombatSystem(this);
    this.loot = new LootSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.obstacles = new WorldObstacleSystem(this);
    this.summons = new SummonSystem(this);
    this.upgradeEffects = new UpgradeEffectSystem(this);
    this.bindUi();
    this.ui.showGame();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  createWorld() {
    this.physics.world.setBounds(-100000, -100000, 200000, 200000);
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'ashen-map')
      .setOrigin(0).setScrollFactor(0).setDepth(0).setAlpha(.94).setTint(0xc0cada);
    this.onResize = (size) => this.background?.setSize(size.width, size.height);
    this.scale.on('resize', this.onResize);
  }

  createGroups() {
    this.enemies = this.physics.add.group({ maxSize: this.performance.enemyGroup });
    this.bullets = this.physics.add.group({ maxSize: this.performance.bulletCap });
    this.enemyBullets = this.physics.add.group({ maxSize: this.performance.enemyBulletCap });
    this.gems = this.physics.add.group({ maxSize: this.performance.gemCap });
    this.chests = this.physics.add.group({ maxSize: 4 });
  }

  createPlayer() {
    const atlas = HERO_ATLASES[this.state.hero.id];
    this.player = this.physics.add.sprite(0, 0, atlas.key, 24).setDepth(25);
    const scale = 78 / atlas.frameHeight;
    this.playerBaseScale = scale;
    this.player.setScale(scale);
    this.player.body.setSize(this.state.hero.size / scale, this.state.hero.size / scale, true);
    this.player.body.setMaxVelocity(500, 500);
    attachGroundShadow(this, this.player, {
      width: this.player.displayWidth * .48,
      height: 11,
      offsetY: this.player.displayHeight * .34,
      depth: 24,
      alpha: .44,
    });
    this.cameras.main.startFollow(this.player, true, .11, .11);
    this.cameras.main.setZoom(this.performance.cameraZoom);
    this.playerLights = createPlayerLights(this, this.player, this.performance.lightScale);
    this.reloadIndicator = createReloadIndicator(this, this.player);
  }

  bindUi() {
    this.ui.onPause = () => this.pauseRun();
    this.ui.onResume = () => this.resumeRun();
    this.ui.onQuit = () => { this.resumeRun(); this.endRun(false); };
  }

  update(_time, deltaMs) {
    if (this.ended || this.choiceOpen) return;
    const deltaSeconds = Math.min(deltaMs, 50) / 1000;
    this.state.tick(deltaSeconds);
    if (this.state.elapsed >= RUN_SECONDS) { this.endRun(true); return; }
    const input = this.inputController.snapshot(this.player);
    this.lastInput = input;
    if (input.firing) this.aimHoldUntil = this.time.now + 850;
    const firingPenalty = movementMultiplier(input.firing, this.state.flags.runGun);
    this.player.setVelocity(input.moveX * this.state.moveSpeed * firingPenalty, input.moveY * this.state.moveSpeed * firingPenalty);
    const facing = facingVector(input, this.facing, this.time.now < this.aimHoldUntil || this.state.reloading);
    this.facing = facing;
    playDirectional(this.player, HERO_ATLASES[this.state.hero.id].key, facing.x, facing.y, Math.hypot(input.moveX, input.moveY) > .08);
    updateShotFeedback(this, deltaSeconds);
    syncGroundShadow(this.player);
    syncPlayerLights(this.playerLights, this.player);
    syncReloadIndicator(this.reloadIndicator, this.player, this.state, deltaSeconds);
    updateWeaponCharge(this.state, deltaSeconds, input);
    updateMovementFeedback(this, deltaSeconds, input);
    this.updateDynamicBonuses(deltaSeconds, input);
    this.combat.update(deltaMs, input);
    this.spawner.update(deltaSeconds);
    this.enemySystem.update(deltaSeconds);
    this.loot.update();
    this.obstacles.update();
    this.summons.update(deltaSeconds);
    this.upgradeEffects.update(deltaSeconds, input);
    this.background.tilePositionX = this.cameras.main.scrollX;
    this.background.tilePositionY = this.cameras.main.scrollY;
    this.hudAccumulator += deltaSeconds;
    if (this.hudAccumulator >= .08) {
      this.hudAccumulator = 0;
      this.ui.updateHud(this.state, RUN_SECONDS - this.state.elapsed);
      this.ui.showBoss(this.activeBoss?.active ? this.activeBoss : null);
    }
  }

  updateDynamicBonuses(delta, input) {
    const moving = Math.hypot(input.moveX, input.moveY) > .3;
    this.movingTime = moving ? Math.min(5, (this.movingTime || 0) + delta) : 0;
    this.stillTime = !moving ? Math.min(4, (this.stillTime || 0) + delta) : 0;
    this.state.dynamicDamageMul = (this.state.flags.levelDamage ? this.state.level * .02 : 0)
      + (this.state.flags.momentumDamage ? this.movingTime / 5 * .3 : 0);
    this.state.dynamicFireRateMul = (this.state.flags.standFire ? this.stillTime / 4 * .35 : 0)
      + (this.state.flags.shieldFire && this.state.shieldReady ? .3 : 0);
    this.regenAccumulator += delta;
    const regen = this.state.flags.regenSeconds;
    if (regen && this.regenAccumulator >= regen) { this.regenAccumulator = 0; this.state.heal(1); }
    this.magnetAccumulator += delta;
    if (this.state.flags.magnetPulse && this.magnetAccumulator >= 20) {
      this.magnetAccumulator = 0;
      this.gems.getChildren().forEach((gem) => gem?.active && this.physics.moveToObject(gem, this.player, 520));
    }
  }

  nearestEnemy(x, y, range, excluded = null) {
    let best = null;
    let bestDistance = range;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy === excluded) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance < bestDistance) { best = enemy; bestDistance = distance; }
    });
    return best;
  }

  onShot(angle) {
    this.facing = { x: Math.cos(angle), y: Math.sin(angle) };
    this.aimHoldUntil = this.time.now + 850;
    const x = this.player.x + Math.cos(angle) * 31;
    const y = this.player.y + Math.sin(angle) * 31;
    const flame = this.state.weapon.id === 'flame';
    const scale = this.state.weapon.id === 'shotgun' ? .58 : flame ? .46 : .38;
    this.flashEffect(x, y, flame ? 2 : 0, scale);
    triggerShotFeedback(this, angle);
    this.cameras.main.shake(55, this.performance.mobile ? .0012 : .0007);
  }

  flashEffect(x, y, row, scale = .7) {
    if (this.activeVfx >= this.performance.vfxCap) return null;
    this.activeVfx += 1;
    const effect = this.add.sprite(x, y, 'combat-vfx', row * 6).setDepth(40).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
    effect.once('destroy', () => { this.activeVfx = Math.max(0, this.activeVfx - 1); });
    effect.play(`combat-vfx-${row}`);
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
    return effect;
  }

  queueLevelUps(count) {
    for (let index = 0; index < count; index += 1) this.choiceQueue.push({ type: 'level' });
    this.processChoiceQueue();
  }

  openChest(perks) {
    this.choiceQueue.unshift({ type: 'chest', perks });
    this.processChoiceQueue();
  }

  async processChoiceQueue() {
    if (this.choiceOpen || this.ended || !this.choiceQueue.length) return;
    this.choiceOpen = true;
    this.physics.pause();
    this.time.paused = true;
    const item = this.choiceQueue.shift();
    let cards = item.type === 'chest'
      ? item.perks.filter((perk) => !this.state.owned.has(perk.id))
      : sampleWithoutReplacement(eligibleUpgrades(this.state.owned), 4);
    let rerolls = item.type === 'level' && this.state.hero.passive === 'reroll' ? 1 : 0;
    while (cards.length) {
      const choice = await this.ui.choose(cards, {
        chest: item.type === 'chest', canReroll: rerolls > 0, owned: this.state.owned,
      });
      if (choice.reroll) {
        rerolls -= 1;
        cards = sampleWithoutReplacement(eligibleUpgrades(this.state.owned), 4);
        continue;
      }
      this.state.applyUpgrade(choice.card);
      this.applyPlayerSize();
      this.upgradeEffects.showAcquired(choice.card);
      this.ui.toast(choice.card.name);
      break;
    }
    this.repelEnemies();
    this.choiceOpen = false;
    this.time.paused = false;
    this.physics.resume();
    if (this.choiceQueue.length) queueMicrotask(() => this.processChoiceQueue());
  }

  repelEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active) return;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      enemy.x += Math.cos(angle) * 34;
      enemy.y += Math.sin(angle) * 34;
    });
  }

  applyPlayerSize() {
    const multiplier = 1 + (this.state.mods.sizeMul || 0);
    const scale = this.playerBaseScale * multiplier;
    this.player.setScale(scale);
    this.player.body.setSize(this.state.hero.size / scale, this.state.hero.size / scale, true);
  }

  pauseRun() {
    if (this.ended || this.choiceOpen) return;
    this.scene.pause();
    this.ui.showPause();
  }

  resumeRun() {
    this.ui.hidePause();
    if (this.scene.isPaused()) this.scene.resume();
  }

  async endRun(won) {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    this.enemyBullets.clear(true, true);
    const score = scoreForRun({ kills: this.state.kills, bosses: this.state.bosses, level: this.state.level, elapsed: this.state.elapsed, won }) + this.runScore;
    const result = { won, score, kills: this.state.kills, bosses: this.state.bosses, level: this.state.level, elapsed: this.state.elapsed };
    this.profile.runs += 1;
    this.profile.wins += won ? 1 : 0;
    this.profile.totalKills += this.state.kills;
    this.profile.best = Math.max(this.profile.best || 0, score);
    await Promise.all([
      this.platform.saveProfile(this.profile),
      this.platform.submitScore(score, { won, kills: result.kills, level: result.level }),
    ]);
    const friends = await this.platform.friends();
    this.ui.showResult(result, friends);
  }

  cleanup() {
    this.scale.off('resize', this.onResize);
    this.inputController?.destroy();
    this.time.paused = false;
    this.ui.hidePause();
  }
}
