import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const grid = 4;
const sourceCellSize = 1254 / grid;
const targetCellSize = 256;
const contentSize = 238;
const definitions = [
  ['celestial-dragon-vfx-source.png', 'celestial-dragon-vfx-atlas.webp'],
  ['obsidian-eclipse-vfx-source.png', 'obsidian-eclipse-vfx-atlas.webp'],
  ['prismatic-tempest-vfx-source.png', 'prismatic-tempest-vfx-atlas.webp'],
  ['chrono-kitsune-vfx-source.png', 'chrono-kitsune-vfx-atlas.webp'],
];

function cleanAlpha(data) {
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] > 7) continue;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }
  return data;
}

function alphaBounds(data, width, height) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] <= 7) continue;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) throw new Error('Empty VFX cell');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function cellImage(source, column, row) {
  const left = Math.round(column * sourceCellSize);
  const top = Math.round(row * sourceCellSize);
  const right = Math.round((column + 1) * sourceCellSize);
  const bottom = Math.round((row + 1) * sourceCellSize);
  const { data, info } = await sharp(source)
    .extract({ left, top, width: right - left, height: bottom - top })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cleanAlpha(data);
  const bounds = alphaBounds(data, info.width, info.height);
  return sharp(data, { raw: info }).extract(bounds)
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    }).png().toBuffer();
}

async function prepare(sourceName, targetName) {
  const source = resolve(root, `assets/skins/premium/vfx/source/${sourceName}`);
  const target = resolve(root, `assets/skins/premium/vfx/${targetName}`);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1254 || metadata.height !== 1254) {
    throw new Error(`${sourceName} must be 1254x1254`);
  }
  const composites = [];
  for (let row = 0; row < grid; row += 1) for (let column = 0; column < grid; column += 1) {
    composites.push({
      input: await cellImage(source, column, row),
      left: column * targetCellSize + (targetCellSize - contentSize) / 2,
      top: row * targetCellSize + (targetCellSize - contentSize) / 2,
    });
  }
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites)
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(target);
  console.log(`${targetName}: 1024x1024, 16 isolated cells`);
}

for (const definition of definitions) await prepare(...definition);
