import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyOriginalPlayerHitbox, characterSizeScale, ORIGINAL_PLAYER_HITBOX,
  PLAYER_DISPLAY_HEIGHT, playerHitboxGeometry,
} from '../src/game/PlayerHitbox.js';

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
}

function fakeSprite() {
  return {
    setScale(value) { this.scale = value; return this; },
    body: {
      setSize(width, height, center) { this.sourceWidth = width; this.sourceHeight = height; this.center = center; return this; },
      setOffset(x, y) { this.offsetX = x; this.offsetY = y; return this; },
    },
  };
}

test('player uses the original narrow vertical 10MTD PlayerHitbox proportions', () => {
  const hitbox = playerHitboxGeometry();
  close(hitbox.width, PLAYER_DISPLAY_HEIGHT * ORIGINAL_PLAYER_HITBOX.width);
  close(hitbox.height, PLAYER_DISPLAY_HEIGHT * ORIGINAL_PLAYER_HITBOX.height);
  assert.ok(hitbox.width < hitbox.height * 0.3);
  close(hitbox.width, 12.174115061759949);
  close(hitbox.height, 42.0151584148407);
});

test('all hero atlas shapes produce one common world hitbox', () => {
  for (const atlas of [{ frameWidth: 181, frameHeight: 181 }, { frameWidth: 222, frameHeight: 148 }]) {
    const sprite = fakeSprite();
    const baseScale = PLAYER_DISPLAY_HEIGHT / atlas.frameHeight;
    const geometry = applyOriginalPlayerHitbox(sprite, atlas, baseScale, 1);
    close(sprite.body.sourceWidth * sprite.scale, geometry.width);
    close(sprite.body.sourceHeight * sprite.scale, geometry.height);
    assert.equal(sprite.body.center, false);
  }
});

test('Character Size scales both the hero and its physics hitbox', () => {
  assert.equal(characterSizeScale({ playerSizeMul: 0.5 }), 1.5);
  const atlas = { frameWidth: 181, frameHeight: 181 };
  const normal = fakeSprite();
  const giant = fakeSprite();
  const baseScale = PLAYER_DISPLAY_HEIGHT / atlas.frameHeight;
  const normalGeometry = applyOriginalPlayerHitbox(normal, atlas, baseScale, 1);
  const giantGeometry = applyOriginalPlayerHitbox(giant, atlas, baseScale, 1.5);
  close(giant.scale / normal.scale, 1.5);
  close(giant.body.sourceWidth * giant.scale, normalGeometry.width * 1.5);
  close(giant.body.sourceHeight * giant.scale, normalGeometry.height * 1.5);
  close(giantGeometry.offsetY, normalGeometry.offsetY * 1.5);
});
