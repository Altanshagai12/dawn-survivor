import { HERO_ATLASES } from '../config/assets.js?build=20260825r';
import { ENEMIES, RUN_SECONDS } from '../data/enemies.js?build=20260826g';
import { HEROES } from '../data/heroes.js?build=20260826e';
import { TOMES, sampleUpgradeCards } from '../data/upgrades.js?build=20260826b';
import { WEAPONS } from '../data/weapons.js?build=20260827b';
import { createCameraFittedBackground } from './BackgroundSystem.js?build=20260826d';
import { CombatSystem } from './CombatSystem.js?build=20260827c';
import { BossBarrierSystem } from './BossBarrierSystem.js?build=20260827a';
import { CharacterAbilitySystem } from './CharacterAbilitySystem.js?build=20260827d';
import { EnemySystem } from './EnemySystem.js?build=20260827c';
import { InputController } from './InputController.js?build=20260826b';
import { LootSystem } from './LootSystem.js?build=20260826k';
import { RunState } from './RunState.js?build=20260825r';
import { Spawner } from './Spawner.js?build=20260826j';
import { SummonSystem } from './SummonSystem.js?build=20260825r';
import { UpgradeEffectSystem } from './UpgradeEffectSystem.js?build=20260825r';
import { WorldObstacleSystem } from './WorldObstacleSystem.js?build=20260826c';
import { WeaponAudio } from './WeaponAudio.js?build=20260826f';
import { presentWeaponShot } from './WeaponPresentation.js?build=20260826g';
import { gameDeviceProfile } from './deviceProfile.js?build=20260826j';
import { movementMultiplier } from './movement.js?build=20260825r';
import { updateMovementFeedback, updateShotFeedback, updateWeaponCharge } from './PlayerFeedback.js?build=20260826f';
import { facingVector, playDirectional } from './animations.js?build=20260825r';
import { scoreForRun, survivalRecordMs } from './simulation.js?build=20260826j';
import {
  attachGroundShadow, createGameTextures, createPlayerLights, createReloadIndicator,
  syncGroundShadow, syncPlayerLights, syncReloadIndicator,
} from './VisualEffects.js?build=20260826i';

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(selection) {
    this.selection = selection;
    this.ended = false;
    this.choiceQueue = [];
    this.choiceOpen = false;
    this.runScore = 0;
    this.hudAccumulator = 0;
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
    this.weaponAudio = new WeaponAudio();
    this.inputController = new InputController(this);
    this.barrier = new BossBarrierSystem(this);
    this.spawner = new Spawner(this);
    this.combat = new CombatSystem(this);
    this.loot = new LootSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.obstacles = new WorldObstacleSystem(this);
    this.characterAbility = new CharacterAbilitySystem(this);
    this.summons = new SummonSystem(this);
    this.upgradeEffects = new UpgradeEffectSystem(this);
    this.bindUi();
    this.ui.showGame();
    this.abilityButton = document.getElementById('ability-button');
    this.abilityButton?.classList.toggle('hidden', this.state.hero.id !== 'hina');
    this.syncAbilityCooldown();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  createWorld() {
    this.physics.world.setBounds(-100000, -100000, 200000, 200000);
    const background = createCameraFittedBackground(this, 'ashen-map', this.performance.cameraZoom);
    this.background = background.sprite;
    this.onResize = background.resize;
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
    const dashing = this.characterAbility.update(input);
    this.syncAbilityCooldown();
    const firingPenalty = movementMultiplier(input.firing, (this.state.mods.walkSpeedMul || 0) >= 1);
    if (!dashing) this.player.setVelocity(
      input.moveX * this.state.moveSpeed * firingPenalty,
      input.moveY * this.state.moveSpeed * firingPenalty,
    );
    const facing = facingVector(input, this.facing, this.time.now < this.aimHoldUntil || this.state.reloading);
    this.facing = facing;
    playDirectional(this.player, HERO_ATLASES[this.state.hero.id].key, facing.x, facing.y, Math.hypot(input.moveX, input.moveY) > .08);
    updateShotFeedback(this, deltaSeconds);
    syncGroundShadow(this.player);
    syncPlayerLights(this.playerLights, this.player);
    syncReloadIndicator(this.reloadIndicator, this.player, this.state, deltaSeconds);
    updateWeaponCharge(this.state, deltaSeconds, input);
    updateMovementFeedback(this, deltaSeconds, input);
    this.combat.update(deltaMs, input);
    this.spawner.update(deltaSeconds);
    this.enemySystem.update(deltaSeconds);
    this.loot.update();
    this.obstacles.update();
    this.barrier.update();
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

  syncAbilityCooldown() {
    if (!this.abilityButton || this.state.hero.id !== 'hina') return;
    const cooldown = this.characterAbility.getDashCooldownState();
    this.abilityButton.disabled = !cooldown.ready;
    this.abilityButton.classList.toggle('cooling-down', !cooldown.ready);
    this.abilityButton.style.setProperty('--ability-charge', `${cooldown.progress * 100}%`);
    this.abilityButton.textContent = cooldown.ready
      ? 'DASH'
      : `${(cooldown.remainingMs / 1000).toFixed(1)}s`;
  }

  onShot(angle, { shotAngles } = {}) {
    this.facing = { x: Math.cos(angle), y: Math.sin(angle) };
    this.aimHoldUntil = this.time.now + 850;
    presentWeaponShot(this, angle, shotAngles);
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

  openBossReward(type) {
    this.choiceQueue.unshift({ type });
    this.processChoiceQueue();
  }

  async processChoiceQueue() {
    if (this.choiceOpen || this.ended || !this.choiceQueue.length) return;
    this.choiceOpen = true;
    this.physics.pause();
    this.time.paused = true;
    const item = this.choiceQueue.shift();
    let cards = item.type === 'tome'
      ? TOMES.filter((tome) => !this.state.owned.has(tome.id))
      : sampleUpgradeCards(this.state, item.type === 'chest' ? 1 : undefined);
    let rerolls = item.type === 'level' && this.state.hero.passive === 'reroll' ? 1 : 0;
    while (cards.length) {
      const choice = await this.ui.choose(cards, {
        rewardType: item.type, canReroll: rerolls > 0, owned: this.state.owned,
      });
      if (choice.reroll) {
        rerolls -= 1;
        cards = sampleUpgradeCards(this.state);
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
    const multiplier = 1 + (this.state.mods.playerSizeMul || 0);
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
    const survivalMs = survivalRecordMs(this.state.elapsed);
    const result = {
      won,
      score,
      survivalMs,
      kills: this.state.kills,
      bosses: this.state.bosses,
      level: this.state.level,
      elapsed: this.state.elapsed,
      damageSource: won ? null : this.enemySystem.lastDamageSource,
    };
    this.profile.runs += 1;
    this.profile.wins += won ? 1 : 0;
    this.profile.totalKills += this.state.kills;
    this.profile.best = Math.max(this.profile.best || 0, score);
    this.profile.bestSurvivalMs = Math.max(this.profile.bestSurvivalMs || 0, survivalMs);
    await Promise.all([
      this.platform.saveProfile(this.profile),
      this.platform.submitScore(survivalMs, {
        metric: 'survival_ms', duration_ms: survivalMs, survivalMs,
        won, kills: result.kills, level: result.level,
      }),
    ]);
    const friends = await this.platform.friends();
    this.ui.showResult(result, friends);
  }

  cleanup() {
    this.scale.off('resize', this.onResize);
    this.inputController?.destroy();
    this.characterAbility?.destroy();
    this.summons?.destroy();
    this.weaponAudio?.destroy();
    this.time.paused = false;
    this.ui.hidePause();
  }
}
