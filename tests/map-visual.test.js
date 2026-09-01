import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

import { STATIC_ASSETS } from '../src/config/assets.js';

test('mobile ground stays calm, distant, and readable at high density', async () => {
  const file = fileURLToPath(new URL(STATIC_ASSETS.map.replace('./', '../'), import.meta.url));
  const { data, info } = await sharp(file).resize(512, 512).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let squareSum = 0;
  let adjacentDifference = 0;
  let adjacentCount = 0;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * info.channels;
    const luminance = data[offset] * .2126 + data[offset + 1] * .7152 + data[offset + 2] * .0722;
    sum += luminance;
    squareSum += luminance ** 2;
    if (x > 0) {
      const previous = offset - info.channels;
      const previousLuminance = data[previous] * .2126
        + data[previous + 1] * .7152 + data[previous + 2] * .0722;
      adjacentDifference += Math.abs(luminance - previousLuminance);
      adjacentCount += 1;
    }
  }
  const pixels = info.width * info.height;
  const mean = sum / pixels;
  const deviation = Math.sqrt(squareSum / pixels - mean ** 2);
  assert.ok(mean >= 18 && mean <= 24, `ground luminance ${mean.toFixed(2)} should preserve visibility`);
  assert.ok(deviation <= 1.8, `ground contrast ${deviation.toFixed(2)} should not fatigue the eye`);
  assert.ok(adjacentDifference / adjacentCount <= .9, 'ground micro-detail should read as distant soil');
});
