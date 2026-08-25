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
    gem.body.setCircle(5);
    gem.setVelocity(Phaser.Math.Between(-45, 45), Phaser.Math.Between(-45, 45));
    this.scene.time.delayedCall(180, () => gem.active && gem.setVelocity(0, 0));
  }

  dropBossReward(x, y, rewardType = 'chest') {
    const chest = this.scene.chests.create(x, y, 'chest');
    if (!chest) return;
    chest.setDepth(15).setScale(1.1).setData('rewardType', rewardType);
    chest.body.setCircle(18);
    this.scene.tweens.add({ targets: chest, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  update() {
    const pickupRange = 92 * this.scene.state.multiplierStats.pickup;
    this.scene.gems.getChildren().forEach((gem) => {
      if (!gem?.active) return;
      const distance = Phaser.Math.Distance.Between(gem.x, gem.y, this.scene.player.x, this.scene.player.y);
      if (distance < pickupRange) {
        const speed = 250 + Math.max(0, pickupRange - distance) * 3;
        this.scene.physics.moveToObject(gem, this.scene.player, speed);
      }
    });
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
    chest.destroy();
    this.scene.openBossReward(rewardType);
  }
}
