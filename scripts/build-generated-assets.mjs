import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sheetNames = [
  '01-damage.png',
  '02-summons-a.png',
  '03-summons-status.png',
  '04-status-defense.png',
  '05-soul-general.png',
];
const BACKGROUND = '#08070d';
const VISIBLE_LEVEL = 36;
const FRAME_WIDTH = 76;
const FRAME_HEIGHT = 84;

function projectionBands(values, minimum) {
  const result = [];
  let start = -1;
  values.forEach((value, index) => {
    if (value >= minimum && start < 0) start = index;
    if (value < minimum && start >= 0) {
      result.push([start, index - 1]);
      start = -1;
    }
  });
  if (start >= 0) result.push([start, values.length - 1]);
  return result;
}

function isVisible(data, offset) {
  return Math.max(data[offset], data[offset + 1], data[offset + 2]) >= VISIBLE_LEVEL;
}

function isDecorativeFrame(data, offset) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return r >= 24 && g >= 44 && b >= 24 && g - r >= 7 && g - b >= 3 && g <= 190;
}

function pixelBounds(data, info, [left, right], [top, bottom], predicate) {
  let minX = right;
  let minY = bottom;
  let maxX = left;
  let maxY = top;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (!predicate(data, offset)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('Upgrade icon frame contains no matching pixels');
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function remapFrame(data, info, bounds) {
  const output = Buffer.alloc(96 * 96 * 4);
  const targetLeft = (96 - FRAME_WIDTH) / 2;
  const targetTop = (96 - FRAME_HEIGHT) / 2;
  for (let y = 0; y < 96; y += 1) {
    const sourceY = Math.round(bounds.top + (y - targetTop) * (bounds.height - 1) / (FRAME_HEIGHT - 1));
    for (let x = 0; x < 96; x += 1) {
      const sourceX = Math.round(bounds.left + (x - targetLeft) * (bounds.width - 1) / (FRAME_WIDTH - 1));
      const targetOffset = (y * 96 + x) * 4;
      if (sourceX < 0 || sourceX >= info.width || sourceY < 0 || sourceY >= info.height) {
        output[targetOffset] = 8;
        output[targetOffset + 1] = 7;
        output[targetOffset + 2] = 13;
      } else {
        const sourceOffset = (sourceY * info.width + sourceX) * info.channels;
        output[targetOffset] = data[sourceOffset];
        output[targetOffset + 1] = data[sourceOffset + 1];
        output[targetOffset + 2] = data[sourceOffset + 2];
      }
      output[targetOffset + 3] = 255;
    }
  }
  return output;
}

function normalizedFrameTile(data, info, bounds) {
  const tileInfo = { width: 96, height: 96, channels: 4 };
  let tile = remapFrame(data, info, bounds);
  for (let pass = 0; pass < 3; pass += 1) {
    const frame = pixelBounds(tile, tileInfo, [0, 95], [0, 95], isDecorativeFrame);
    const centered = Math.abs(frame.left + (frame.width - 1) / 2 - 47.5) <= .5
      && Math.abs(frame.top + (frame.height - 1) / 2 - 47.5) <= .5;
    if (frame.width === FRAME_WIDTH && frame.height === FRAME_HEIGHT && centered) break;
    tile = remapFrame(tile, tileInfo, frame);
  }
  return tile;
}

async function detectGrid(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const xProjection = Array(info.width).fill(0);
  const yProjection = Array(info.height).fill(0);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (!isVisible(data, offset)) continue;
      xProjection[x] += 1;
      yProjection[y] += 1;
    }
  }
  const columns = projectionBands(xProjection, 10);
  const rows = projectionBands(yProjection, 8);
  if (columns.length !== 4 || rows.length !== 5) {
    throw new Error(`${file}: expected a 4x5 icon grid, received ${columns.length}x${rows.length}`);
  }
  return { data, info, columns, rows };
}

async function buildUpgradeAtlas() {
  const tiles = [];
  for (const sheetName of sheetNames) {
    const file = resolve(root, 'assets/ui/upgrade-sheets', sheetName);
    const grid = await detectGrid(file);
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const bounds = pixelBounds(
          grid.data,
          grid.info,
          grid.columns[column],
          grid.rows[row],
          isDecorativeFrame,
        );
        const input = normalizedFrameTile(grid.data, grid.info, bounds);
        tiles.push({ input, raw: { width: 96, height: 96, channels: 4 }, left: (tiles.length % 10) * 96, top: Math.floor(tiles.length / 10) * 96 });
      }
    }
  }
  await sharp({ create: { width: 960, height: 960, channels: 4, background: BACKGROUND } })
    .composite(tiles)
    .webp({ lossless: true, effort: 6 })
    .toFile(resolve(root, 'assets/ui/upgrade-icons.webp'));
}

async function buildWorldAssets() {
  await sharp(resolve(root, 'assets/map/night-soil-source.png'))
    .resize(1024, 1024, { fit: 'cover' })
    .webp({ quality: 88, smartSubsample: true })
    .toFile(resolve(root, 'assets/map/night-soil.webp'));
  await sharp(resolve(root, 'assets/sprites/mysterious-tree-source.png'))
    .resize(1084, 362, { fit: 'fill' })
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true })
    .toFile(resolve(root, 'assets/sprites/mysterious-tree-4f.webp'));
}

await mkdir(resolve(root, 'assets/ui'), { recursive: true });
await buildUpgradeAtlas();
if (!process.argv.includes('--upgrades-only')) await buildWorldAssets();
console.log(process.argv.includes('--upgrades-only')
  ? 'Built 100 centered upgrade icons.'
  : 'Built 100 centered upgrade icons, ground texture, and 4-frame tree sprite.');
