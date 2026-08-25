import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260825r';
import { DAMAGE_SOURCE } from './EnemySystem.js?build=20260825r';

export class BossBarrierSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.graphics = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  }

  activate(x, y) {
    this.active = true;
    this.center = { x, y };
    this.startedAt = this.scene.state.elapsed;
    this.draw();
  }

  deactivate() {
    this.active = false;
    this.graphics.clear();
  }

  bounds() {
    const config = TEN_MINUTES_BALANCE.barrier;
    const progress = Phaser.Math.Clamp(
      (this.scene.state.elapsed - this.startedAt) / config.shrinkSeconds, 0, 1,
    );
    const width = Phaser.Math.Linear(config.startWidth, config.endWidth, progress);
    const height = Phaser.Math.Linear(config.startHeight, config.endHeight, progress);
    return {
      x: this.center.x - width / 2, y: this.center.y - height / 2,
      right: this.center.x + width / 2, bottom: this.center.y + height / 2,
      width, height,
    };
  }

  isSpawnPointAllowed(point) {
    if (!this.active) return true;
    const bounds = this.bounds();
    return point.x > bounds.x + 36 && point.x < bounds.right - 36
      && point.y > bounds.y + 36 && point.y < bounds.bottom - 36;
  }

  update() {
    if (!this.active) return;
    const bounds = this.bounds();
    const padding = Math.max(10, this.scene.state.hero.size * .35);
    const x = Phaser.Math.Clamp(this.scene.player.x, bounds.x + padding, bounds.right - padding);
    const y = Phaser.Math.Clamp(this.scene.player.y, bounds.y + padding, bounds.bottom - padding);
    if (x !== this.scene.player.x || y !== this.scene.player.y) {
      this.scene.player.setPosition(x, y).setVelocity(0, 0);
      this.scene.enemySystem.damagePlayer(1, DAMAGE_SOURCE.BARRIER);
    }
    this.draw(bounds);
  }

  draw(bounds = this.bounds()) {
    const pulse = .55 + Math.sin(this.scene.time.now * .018) * .2;
    this.graphics.clear();
    this.graphics.lineStyle(8, 0x612a96, .2).strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.graphics.lineStyle(2, 0xc678ff, pulse).strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
}
