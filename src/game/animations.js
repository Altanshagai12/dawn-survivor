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

export function playDirectional(sprite, key, x, y, moving = true) {
  const row = directionRowFromVector(x, y);
  const direction = DIRECTION_ROWS[row];
  if (moving) sprite.play(`${key}-${direction}`, true);
  else {
    sprite.stop();
    sprite.setFrame(row * 6);
  }
  sprite.directionRow = row;
}
