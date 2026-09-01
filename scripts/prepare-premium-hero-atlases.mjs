import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const columns = 6;
const rows = 8;
const backgroundLimit = 42;

const atlases = [
  { id: 'shana-astral-warden', frameWidth: 181, frameHeight: 181 },
  { id: 'diamond-bloodmoon-regent', frameWidth: 222, frameHeight: 148 },
  { id: 'scarlett-sunforge-phoenix', frameWidth: 181, frameHeight: 181 },
  { id: 'hina-void-lotus', frameWidth: 181, frameHeight: 181 },
];

function isExteriorBlack(data, pixel) {
  const offset = pixel * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const maximum = Math.max(red, green, blue);
  return maximum <= backgroundLimit;
}

function clearCellExterior(data, imageWidth, frameWidth, frameHeight, column, row) {
  const visited = new Uint8Array(frameWidth * frameHeight);
  const queue = new Int32Array(frameWidth * frameHeight);
  let head = 0;
  let tail = 0;
  const left = column * frameWidth;
  const top = row * frameHeight;

  const clearBorderPixel = (x, y) => {
    const offset = ((top + y) * imageWidth + left + x) * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  };
  for (let x = 0; x < frameWidth; x += 1) {
    clearBorderPixel(x, 0);
    clearBorderPixel(x, frameHeight - 1);
  }
  for (let y = 1; y < frameHeight - 1; y += 1) {
    clearBorderPixel(0, y);
    clearBorderPixel(frameWidth - 1, y);
  }

  const enqueue = (x, y) => {
    const local = y * frameWidth + x;
    if (visited[local]) return;
    const pixel = (top + y) * imageWidth + left + x;
    if (!isExteriorBlack(data, pixel)) return;
    visited[local] = 1;
    queue[tail++] = local;
  };

  for (let x = 0; x < frameWidth; x += 1) {
    enqueue(x, 0);
    enqueue(x, frameHeight - 1);
  }
  for (let y = 1; y < frameHeight - 1; y += 1) {
    enqueue(0, y);
    enqueue(frameWidth - 1, y);
  }

  while (head < tail) {
    const local = queue[head++];
    const x = local % frameWidth;
    const y = Math.floor(local / frameWidth);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < frameWidth) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < frameHeight) enqueue(x, y + 1);
  }

  for (let local = 0; local < visited.length; local += 1) {
    if (!visited[local]) continue;
    const x = local % frameWidth;
    const y = Math.floor(local / frameWidth);
    data[((top + y) * imageWidth + left + x) * 4 + 3] = 0;
  }
}

function inspectFrames(data, width, definition) {
  let transparent = 0;
  let minimumVisible = Number.POSITIVE_INFINITY;
  let maximumVisible = 0;
  let touchingFrames = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let visible = 0;
      let touching = false;
      for (let y = 0; y < definition.frameHeight; y += 1) {
        for (let x = 0; x < definition.frameWidth; x += 1) {
          const alpha = data[((row * definition.frameHeight + y) * width
            + column * definition.frameWidth + x) * 4 + 3];
          if (!alpha) transparent += 1;
          else {
            visible += 1;
            if (x === 0 || y === 0 || x === definition.frameWidth - 1
              || y === definition.frameHeight - 1) touching = true;
          }
        }
      }
      minimumVisible = Math.min(minimumVisible, visible);
      maximumVisible = Math.max(maximumVisible, visible);
      if (touching) touchingFrames += 1;
    }
  }
  return {
    minimumVisible,
    maximumVisible,
    touchingFrames,
    transparentRatio: transparent / (width * definition.frameHeight * rows),
  };
}

async function prepare(definition) {
  const width = definition.frameWidth * columns;
  const height = definition.frameHeight * rows;
  const source = resolve(root,
    `assets/skins/premium/heroes/source/${definition.id}-atlas-source.png`);
  const target = resolve(root, `assets/skins/premium/heroes/${definition.id}-atlas.webp`);
  const { data } = await sharp(source)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      clearCellExterior(data, width, definition.frameWidth, definition.frameHeight, column, row);
    }
  }

  const report = inspectFrames(data, width, definition);
  if (report.minimumVisible < 480 || report.touchingFrames) {
    throw new Error(`${definition.id} failed frame isolation: ${JSON.stringify(report)}`);
  }
  await sharp(data, { raw: { width, height, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(target);
  console.log(`${definition.id}: ${width}x${height} ${JSON.stringify(report)}`);
}

for (const atlas of atlases) await prepare(atlas);
