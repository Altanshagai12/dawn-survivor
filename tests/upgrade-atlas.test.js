import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

const FRAME_SIZE = 96;
const VISIBLE_LEVEL = 36;

test('every upgrade icon is centered inside its atlas frame', async () => {
  const file = fileURLToPath(new URL('../assets/ui/upgrade-icons.webp', import.meta.url));
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let frame = 0; frame < 100; frame += 1) {
    const frameLeft = (frame % 10) * FRAME_SIZE;
    const frameTop = Math.floor(frame / 10) * FRAME_SIZE;
    let minX = FRAME_SIZE;
    let minY = FRAME_SIZE;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < FRAME_SIZE; y += 1) {
      for (let x = 0; x < FRAME_SIZE; x += 1) {
        const offset = ((frameTop + y) * info.width + frameLeft + x) * info.channels;
        if (Math.max(data[offset], data[offset + 1], data[offset + 2]) < VISIBLE_LEVEL) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.ok(maxX >= minX && maxY >= minY, `frame ${frame} must contain an icon`);
    assert.ok(minX >= 4 && minY >= 4 && maxX <= 91 && maxY <= 91, `frame ${frame} must have safe padding`);
    assert.ok(Math.abs((minX + maxX) / 2 - 47.5) <= 1.5, `frame ${frame} must be horizontally centered`);
    assert.ok(Math.abs((minY + maxY) / 2 - 47.5) <= 1.5, `frame ${frame} must be vertically centered`);
  }
});
