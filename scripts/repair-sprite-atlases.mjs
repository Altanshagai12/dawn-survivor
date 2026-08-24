import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { BOSS_ATLASES, ENEMY_ATLASES, HERO_ATLASES } from '../src/config/assets.js';
import { cleanSimpleAtlas, stripPaleOutline, writeSpriteWebp } from './sprite-edge-cleanup.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check') || !shouldWrite;
const FRAME_GAP = 0;
const MIN_COMPONENT_AREA = 2;
const MIN_VISIBLE_ALPHA = 8;

function componentsOf(data, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const stack = new Int32Array(width * height);

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || data[start * 4 + 3] < MIN_VISIBLE_ALPHA) continue;
    let stackLength = 1;
    stack[0] = start;
    visited[start] = 1;
    const pixels = [];
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;

    while (stackLength) {
      const index = stack[--stackLength];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;

      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (!ox && !oy) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || data[next * 4 + 3] < MIN_VISIBLE_ALPHA) continue;
          visited[next] = 1;
          stack[stackLength++] = next;
        }
      }
    }

    if (pixels.length >= MIN_COMPONENT_AREA) {
      components.push({ pixels, area: pixels.length, minX, minY, maxX, maxY, sumX, sumY });
    }
  }
  return components;
}

function boxGap(a, b) {
  const dx = Math.max(0, a.minX - b.maxX - 1, b.minX - a.maxX - 1);
  const dy = Math.max(0, a.minY - b.maxY - 1, b.minY - a.maxY - 1);
  return Math.hypot(dx, dy);
}

function clusterComponents(components) {
  const remaining = new Set(components.map((_component, index) => index));
  const clusters = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const members = [];
    while (queue.length) {
      const index = queue.pop();
      members.push(components[index]);
      for (const candidate of [...remaining]) {
        if (members.some((member) => boxGap(member, components[candidate]) <= FRAME_GAP)) {
          remaining.delete(candidate);
          queue.push(candidate);
        }
      }
    }
    clusters.push(members.reduce((cluster, component) => ({
      components: [...cluster.components, component],
      area: cluster.area + component.area,
      minX: Math.min(cluster.minX, component.minX),
      minY: Math.min(cluster.minY, component.minY),
      maxX: Math.max(cluster.maxX, component.maxX),
      maxY: Math.max(cluster.maxY, component.maxY),
      sumX: cluster.sumX + component.sumX,
      sumY: cluster.sumY + component.sumY,
    }), {
      components: [], area: 0,
      minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY,
      maxX: 0, maxY: 0, sumX: 0, sumY: 0,
    }));
  }
  return clusters;
}

function cropRaw(data, imageWidth, left, top, width, height) {
  const output = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * imageWidth + left) * 4;
    data.copy(output, y * width * 4, sourceStart, sourceStart + width * 4);
  }
  return output;
}

function isolatedFrame(data, imageWidth, components, frame, atlas) {
  const meaningful = components
    .filter((component) => component.area >= 4)
    .sort((a, b) => b.area - a.area);
  const main = meaningful[0];
  if (!main) throw new Error(`${atlas.key} frame ${frame.index} has no visible component`);
  const minimumDetailArea = Math.max(4, Math.round(main.area * .001));
  const selected = meaningful.filter((component) => component.area >= minimumDetailArea);
  const bounds = selected.reduce((box, component) => ({
    minX: Math.min(box.minX, component.minX),
    minY: Math.min(box.minY, component.minY),
    maxX: Math.max(box.maxX, component.maxX),
    maxY: Math.max(box.maxY, component.maxY),
  }), { minX: main.minX, minY: main.minY, maxX: main.maxX, maxY: main.maxY });
  const sourceWidth = bounds.maxX - bounds.minX + 1;
  const sourceHeight = bounds.maxY - bounds.minY + 1;
  const source = Buffer.alloc(sourceWidth * sourceHeight * 4);
  for (const component of selected) {
    for (const pixel of component.pixels) {
      const x = pixel % imageWidth;
      const y = Math.floor(pixel / imageWidth);
      const sourcePixel = pixel * 4;
      const targetPixel = ((y - bounds.minY) * sourceWidth + x - bounds.minX) * 4;
      data.copy(source, targetPixel, sourcePixel, sourcePixel + 4);
    }
  }
  return { source, sourceWidth, sourceHeight };
}

async function repairAtlas(atlas) {
  const sourceRelative = atlas.file.replace('-isolated.webp', '.png').replace('.webp', '.png');
  const sourceFile = resolve(root, sourceRelative.replace(/^\.\//, ''));
  const { data, info } = await sharp(sourceFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const components = componentsOf(data, info.width, info.height);
  const largestArea = Math.max(...components.map((component) => component.area));
  const bodyComponents = components.filter((component) => component.area >= largestArea * .1);
  const sourceRows = bodyComponents.length / 6;
  if (![7, 8].includes(sourceRows)) {
    throw new Error(`${atlas.key} has ${bodyComponents.length} visible sprites; expected 42 or 48`);
  }
  const mainComponents = [...bodyComponents]
    .sort((a, b) => b.area - a.area)
    .slice(0, sourceRows * 6)
    .sort((a, b) => (a.sumY / a.area) - (b.sumY / b.area));

  const orderedMains = [];
  for (let row = 0; row < sourceRows; row += 1) {
    orderedMains.push(...mainComponents
      .slice(row * 6, row * 6 + 6)
      .sort((a, b) => (a.sumX / a.area) - (b.sumX / b.area)));
  }

  const frameComponents = Array.from({ length: sourceRows * 6 }, () => []);
  const mainIndexes = new Map(orderedMains.map((component, index) => [component, index]));
  for (const component of components) {
    let frameIndex = mainIndexes.get(component);
    if (frameIndex === undefined) {
      frameIndex = orderedMains.reduce((closest, main, index) => {
        const gap = boxGap(component, main);
        return gap < closest.gap ? { index, gap } : closest;
      }, { index: 0, gap: Number.POSITIVE_INFINITY }).index;
    }
    frameComponents[frameIndex].push(component);
  }
  const sourceFrames = [];
  for (let row = 0; row < sourceRows; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const index = row * 6 + column;
      sourceFrames.push(isolatedFrame(data, info.width, frameComponents[index], { row, column, index }, atlas));
    }
  }
  const targetRows = sourceRows === 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 6];
  const frames = targetRows.flatMap((sourceRow) => sourceFrames.slice(sourceRow * 6, sourceRow * 6 + 6));
  const maximumWidth = Math.max(...frames.map((frame) => frame.sourceWidth));
  const maximumHeight = Math.max(...frames.map((frame) => frame.sourceHeight));
  const scale = Math.min(1, (atlas.frameWidth - 8) / maximumWidth, (atlas.frameHeight - 8) / maximumHeight);
  const outputWidth = atlas.frameWidth * 6;
  const outputHeight = atlas.frameHeight * 8;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const width = Math.max(1, Math.round(frame.sourceWidth * scale));
    const height = Math.max(1, Math.round(frame.sourceHeight * scale));
    const resized = await sharp(frame.source, {
      raw: { width: frame.sourceWidth, height: frame.sourceHeight, channels: 4 },
    }).resize(width, height, { kernel: sharp.kernel.nearest }).raw().toBuffer();
    const column = index % 6;
    const row = Math.floor(index / 6);
    const left = column * atlas.frameWidth + Math.round((atlas.frameWidth - width) / 2);
    const top = row * atlas.frameHeight + Math.round((atlas.frameHeight - height) / 2);
    for (let y = 0; y < height; y += 1) {
      const sourceStart = y * width * 4;
      const targetStart = ((top + y) * outputWidth + left) * 4;
      resized.copy(output, targetStart, sourceStart, sourceStart + width * 4);
    }
  }

  const outputFile = resolve(root, atlas.file.replace(/^\.\//, ''));
  const removed = stripPaleOutline(output, outputWidth, outputHeight);
  await writeSpriteWebp(output, outputWidth, outputHeight, outputFile);
  console.log(`Repaired ${atlas.key}: ${sourceRows} source rows -> 8 rows, removed ${removed} pale edge pixels, shared scale ${scale.toFixed(3)}`);
}

async function checkAtlas(atlas) {
  const file = resolve(root, atlas.file.replace(/^\.\//, ''));
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const problems = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const frame = cropRaw(data, info.width, column * atlas.frameWidth, row * atlas.frameHeight, atlas.frameWidth, atlas.frameHeight);
      const clusters = clusterComponents(componentsOf(frame, atlas.frameWidth, atlas.frameHeight)).sort((a, b) => b.area - a.area);
      const main = clusters[0];
      const discardedArea = clusters.slice(1).reduce((total, cluster) => total + cluster.area, 0);
      const allowedNoise = Math.max(16, Math.round((main?.area || 0) * .01));
      if (!main || discardedArea > allowedNoise
        || main.minX === 0 || main.minY === 0
        || main.maxX === atlas.frameWidth - 1 || main.maxY === atlas.frameHeight - 1) {
        problems.push(row * 6 + column);
      }
    }
  }
  if (problems.length) throw new Error(`${atlas.key}: non-isolated frames ${problems.join(', ')}`);
}

const atlases = [...Object.values(HERO_ATLASES), ...Object.values(BOSS_ATLASES)];
if (shouldWrite) {
  for (const atlas of atlases) await repairAtlas(atlas);
  const wingling = ENEMY_ATLASES.wingling;
  const source = resolve(root, wingling.file.replace('-clean.webp', '.png').replace(/^\.\//, ''));
  const output = resolve(root, wingling.file.replace(/^\.\//, ''));
  const removed = await cleanSimpleAtlas(source, output);
  console.log(`Repaired ${wingling.key}: removed ${removed} pale edge pixels.`);
}
if (shouldCheck) {
  for (const atlas of atlases) await checkAtlas(atlas);
  console.log(`Verified ${atlases.length * 48} isolated hero and boss frames.`);
}
