import { DIRECTION_ROWS } from '../config/assets.js';
import { directionRowFromVector } from './simulation.js';

export function createDirectionalAnimations(scene, atlas, frameRate = 10) {
  DIRECTION_ROWS.forEach((direction, row) => {
    const key = `${atlas.key}-${direction}`;
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(atlas.key, { start: row * 6, end: row * 6 + 5 }),
      frameRate,
      repeat: -1,
    });
  });
}

export function facingVector(input, fallback = { x: 0, y: 1 }, holdAim = false) {
  if ((input.firing || holdAim) && Math.hypot(input.aimX, input.aimY) > .001) {
    return { x: input.aimX, y: input.aimY };
  }
  if (Math.hypot(input.moveX, input.moveY) > .001) return { x: input.moveX, y: input.moveY };
  return { ...fallback };
}

export function directionalPose(x, y, mirrorLeft = false) {
  const row = directionRowFromVector(x, y);
  const flipX = mirrorLeft && row >= 5;
  const frameRow = flipX ? 8 - row : row;
  return { row, frameRow, direction: DIRECTION_ROWS[frameRow], flipX };
}

export function playDirectional(sprite, key, x, y, moving = true, { mirrorLeft = false } = {}) {
  const pose = directionalPose(x, y, mirrorLeft);
  sprite.setFlipX?.(pose.flipX);
  if (moving) sprite.play(`${key}-${pose.direction}`, true);
  else {
    sprite.stop();
    sprite.setFrame(pose.frameRow * 6);
  }
  sprite.directionRow = pose.row;
}
