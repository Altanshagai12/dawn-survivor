import assert from 'node:assert/strict';
import test from 'node:test';
import { erodeExteriorPixels } from '../scripts/sprite-edge-cleanup.mjs';

function opaqueSquare(size, left, top, width, height) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const pixel = (y * size + x) * 4;
      data.fill(220, pixel, pixel + 3);
      data[pixel + 3] = 255;
    }
  }
  return data;
}

test('exterior erosion removes one generated contour while preserving the interior', () => {
  const data = opaqueSquare(5, 1, 1, 3, 3);
  assert.equal(erodeExteriorPixels(data, 5, 5), 8);
  assert.equal(data[(2 * 5 + 2) * 4 + 3], 255);
  assert.equal(data[(1 * 5 + 1) * 4 + 3], 0);
});
