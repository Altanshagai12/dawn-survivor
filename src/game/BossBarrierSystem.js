import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260828i';
import { DAMAGE_SOURCE } from './EnemySystem.js?build=20260902b';

const BODY_CLAMP_EPSILON = 0.01;

export function clampPlayerBodyToBounds(player, bounds) {
  const body = player.body;
  const halfWidth = body?.halfWidth ?? (body?.width || 0) / 2;
  const halfHeight = body?.halfHeight ?? (body?.height || 0) / 2;
  const centerX = body?.center?.x ?? player.x;
  const centerY = body?.center?.y ?? player.y;
  const clampedCenterX = Phaser.Math.Clamp(centerX, bounds.x + halfWidth, bounds.right - halfWidth);
  const clampedCenterY = Phaser.Math.Clamp(centerY, bounds.y + halfHeight, bounds.bottom - halfHeight);
  const correctionX = clampedCenterX - centerX;
  const correctionY = clampedCenterY - centerY;
  const hitX = Math.abs(correctionX) > BODY_CLAMP_EPSILON;
  const hitY = Math.abs(correctionY) > BODY_CLAMP_EPSILON;
  return {
    x: hitX ? player.x + correctionX : player.x,
    y: hitY ? player.y + correctionY : player.y,
    hitX,
    hitY,
  };
}

export class BossBarrierSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.graphics = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  }

  activate(x, y) {
    const config = TEN_MINUTES_BALANCE.barrier;
    const camera = this.scene.cameras?.main;
    const viewportWidth = camera?.width / (camera?.zoom || 1) || 0;
    const viewportHeight = camera?.height / (camera?.zoom || 1) || 0;
    this.active = true;
    this.center = { x, y };
    this.startedAt = this.scene.state.elapsed;
    this.startWidth = Math.max(config.startWidth, viewportWidth * config.startViewportWidthRatio);
    this.startHeight = Math.max(config.startHeight, viewportHeight * config.startViewportHeightRatio);
    this.endWidth = Math.max(config.endWidth, viewportWidth * config.endViewportWidthRatio);
    this.endHeight = Math.max(config.endHeight, viewportHeight * config.endViewportHeightRatio);
    this.contactLatched = false;
    this.bounceUntil = 0;
    this.bounceVector = null;
    this.draw();
  }

  deactivate() {
    this.active = false;
    this.contactLatched = false;
    this.bounceUntil = 0;
    this.bounceVector = null;
    this.graphics.clear();
  }

  bounds() {
    const config = TEN_MINUTES_BALANCE.barrier;
    const progress = Phaser.Math.Clamp(
      (this.scene.state.elapsed - this.startedAt) / config.shrinkSeconds, 0, 1,
    );
    const width = Phaser.Math.Linear(this.startWidth, this.endWidth, progress);
    const height = Phaser.Math.Linear(this.startHeight, this.endHeight, progress);
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
    const config = TEN_MINUTES_BALANCE.barrier;
    const bounds = this.bounds();
    const { x, y, hitX, hitY } = clampPlayerBodyToBounds(this.scene.player, bounds);
    if (hitX || hitY) {
      let nx = hitX ? Math.sign(x - this.scene.player.x) : 0;
      let ny = hitY ? Math.sign(y - this.scene.player.y) : 0;
      const length = Math.hypot(nx, ny) || 1;
      nx /= length;
      ny /= length;
      if (!this.contactLatched) {
        this.contactLatched = true;
        this.bounceUntil = this.scene.time.now + config.bounceMs;
        this.bounceVector = { x: nx, y: ny };
        this.scene.enemySystem.damagePlayer(1, DAMAGE_SOURCE.BARRIER);
      }
      this.scene.player
        .setPosition(x + nx * config.bounceDistance, y + ny * config.bounceDistance)
        .setVelocity(nx * config.bounceSpeed, ny * config.bounceSpeed);
    } else if (this.scene.time.now < this.bounceUntil && this.bounceVector) {
      this.scene.player.setVelocity(
        this.bounceVector.x * config.bounceSpeed,
        this.bounceVector.y * config.bounceSpeed,
      );
    } else {
      this.contactLatched = false;
      this.bounceVector = null;
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
