import { playerBrightLightRadius } from './VisualEffects.js?build=20260826i';

export function xpAttractionRange(lightScale = 1, pickupMultiplier = 1) {
  return playerBrightLightRadius(lightScale) * pickupMultiplier;
}

export function xpAttractionSpeed(distance, range) {
  return 460 + Math.max(0, range - distance) * 4;
}

export function attractLoot(scene, loot, range) {
  if (!loot?.active) return false;
  const distance = Phaser.Math.Distance.Between(loot.x, loot.y, scene.player.x, scene.player.y);
  if (distance > range + 1e-6 && !loot.attracting) return false;
  if (!loot.attracting) {
    loot.attracting = true;
    loot.floatTween?.stop();
    loot.floatTween = null;
  }
  scene.physics.moveToObject(loot, scene.player, xpAttractionSpeed(distance, range));
  return true;
}

export class LootSystem {
  constructor(scene) {
    this.scene = scene;
    scene.physics.add.overlap(scene.player, scene.gems, (_player, gem) => this.collectGem(gem));
    scene.physics.add.overlap(scene.player, scene.chests, (_player, chest) => this.collectChest(chest));
  }

  dropGem(x, y, value = 1) {
    if (this.scene.gems.countActive() >= this.scene.performance.gemCap) {
      const pooled = this.scene.gems.getChildren().find((gem) => gem?.active);
      if (pooled) {
        pooled.xpValue = (pooled.xpValue || 1) + value;
        pooled.setScale(Math.min(1.7, 1 + Math.log2(pooled.xpValue) * .12));
      }
      return;
    }
    const gem = this.scene.gems.create(x, y, 'ember');
    if (!gem) return;
    gem.setDepth(12).setScale(value >= 5 ? 1.35 : 1);
    gem.xpValue = value;
    gem.attracting = false;
    gem.body.setCircle(5);
    gem.setVelocity(Phaser.Math.Between(-45, 45), Phaser.Math.Between(-45, 45));
    this.scene.time.delayedCall(180, () => {
      if (gem.active && !gem.attracting) gem.setVelocity(0, 0);
    });
  }

  dropBossReward(x, y, rewardType = 'chest') {
    const chest = this.scene.chests.create(x, y, 'chest');
    if (!chest) return;
    chest.setDepth(15).setScale(1.1).setData('rewardType', rewardType);
    chest.attracting = false;
    chest.body.setCircle(18);
    chest.floatTween = this.scene.tweens.add({
      targets: chest, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  update() {
    const pickupRange = xpAttractionRange(
      this.scene.performance.lightScale,
      this.scene.state.multiplierStats.pickup,
    );
    this.scene.gems.getChildren().forEach((gem) => attractLoot(this.scene, gem, pickupRange));
    this.scene.chests.getChildren().forEach((chest) => attractLoot(this.scene, chest, pickupRange));
  }

  collectGem(gem) {
    if (!gem.active) return;
    const state = this.scene.state;
    if (state.flags.gemAmmoChance && Math.random() < state.flags.gemAmmoChance) {
      state.ammo = Math.min(state.magazine, state.ammo + 1);
      this.scene.flashEffect(gem.x, gem.y, 4, .24);
    }
    if (state.flags.excitement) state.excitementUntil = state.elapsed + 1;
    const gained = state.gainXp(gem.xpValue || 1);
    gem.destroy();
    if (gained) this.scene.queueLevelUps(gained);
  }

  collectChest(chest) {
    if (!chest.active) return;
    const rewardType = chest.getData('rewardType') || 'chest';
    chest.floatTween?.stop();
    chest.destroy();
    this.scene.openBossReward(rewardType);
  }
}
