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
  { id: 'shana-celestial-dragon-sovereign', frameWidth: 181, frameHeight: 181 },
  { id: 'diamond-obsidian-eclipse-valkyrie', frameWidth: 222, frameHeight: 148 },
  { id: 'scarlett-prismatic-tempest-seraph', frameWidth: 181, frameHeight: 181, mirrorMissingRow: 1 },
  { id: 'hina-nine-tail-chrono-kitsune', frameWidth: 181, frameHeight: 181 },
];

function visible(data, offset) {
  return data[offset + 3] > 6
    && Math.max(data[offset], data[offset + 1], data[offset + 2]) > backgroundLimit;
}

function findBands(counts, minimumLength = 8) {
  const bands = [];
  let start = -1;
  for (let index = 0; index <= counts.length; index += 1) {
    if (index < counts.length && counts[index] > 4 && start < 0) start = index;
    if ((index === counts.length || counts[index] <= 4) && start >= 0) {
      if (index - start >= minimumLength) bands.push([start, index - 1]);
      start = -1;
    }
  }
  return bands;
}

function rowBands(data, width, height) {
  const counts = new Uint32Array(height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (visible(data, (y * width + x) * 4)) counts[y] += 1;
    }
  }
  return findBands(counts);
}

function frameBounds(data, width, height, column, band) {
  const zoneLeft = Math.floor(column * width / columns);
  const zoneRight = Math.floor((column + 1) * width / columns) - 1;
  let left = zoneRight;
  let right = zoneLeft;
  let top = band[1];
  let bottom = band[0];
  for (let y = band[0]; y <= band[1]; y += 1) {
    for (let x = zoneLeft; x <= zoneRight; x += 1) {
      if (!visible(data, (y * width + x) * 4)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top || bottom >= height) throw new Error(`Missing sprite at column ${column}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function isolate(raw, width, bounds) {
  const output = Buffer.alloc(bounds.width * bounds.height * 4);
  let area = 0;
  let weightedX = 0;
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const source = ((bounds.top + y) * width + bounds.left + x) * 4;
      const target = (y * bounds.width + x) * 4;
      if (!visible(raw, source)) continue;
      output[target] = raw[source];
      output[target + 1] = raw[source + 1];
      output[target + 2] = raw[source + 2];
      output[target + 3] = raw[source + 3];
      const alpha = raw[source + 3] / 255;
      area += alpha;
      weightedX += x * alpha;
    }
  }
  return {
    data: output,
    width: bounds.width,
    height: bounds.height,
    area,
    centerX: weightedX / Math.max(1, area),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function resizeFrame(frame, scale, flip) {
  const width = Math.max(1, Math.round(frame.width * scale));
  const height = Math.max(1, Math.round(frame.height * scale));
  let pipeline = sharp(frame.data, { raw: { width: frame.width, height: frame.height, channels: 4 } })
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
  if (flip) pipeline = pipeline.flop();
  const { data } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let weightedX = 0;
  let weight = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = data[(y * width + x) * 4 + 3] / 255;
    weightedX += x * alpha;
    weight += alpha;
  }
  return { data, width, height, centerX: weight ? weightedX / weight : width / 2 };
}

async function normalizeFrames(raw, info, definition, bands) {
  const sourceRows = bands.map((band) => Array.from({ length: columns }, (_, column) => (
    isolate(raw, info.width, frameBounds(raw, info.width, info.height, column, band))
  )));
  const rowMap = Array.from({ length: rows }, (_, row) => {
    if (row < sourceRows.length) return { frames: sourceRows[row], flip: false };
    if (definition.mirrorMissingRow == null) throw new Error(`${definition.id} has only ${sourceRows.length} rows`);
    return { frames: sourceRows[definition.mirrorMissingRow], flip: true };
  });
  const all = rowMap.flatMap(({ frames }) => frames);
  const baseScale = Math.min(
    (definition.frameWidth - 18) / Math.max(...all.map((frame) => (
      Math.max(frame.centerX, frame.width - 1 - frame.centerX) * 2
    ))),
    (definition.frameHeight - 16) / Math.max(...all.map((frame) => frame.height)),
  );
  const normalized = [];
  for (const row of rowMap) {
    const targetArea = median(row.frames.map((frame) => frame.area));
    const frames = [];
    for (const frame of row.frames) {
      const equalizer = Math.sqrt(targetArea / Math.max(1, frame.area));
      const fit = Math.min(
        (definition.frameWidth - 14) / (Math.max(frame.centerX, frame.width - 1 - frame.centerX) * 2),
        (definition.frameHeight - 12) / frame.height,
      );
      frames.push(await resizeFrame(frame, Math.min(fit, baseScale * equalizer), row.flip));
    }
    normalized.push(frames);
  }
  return normalized;
}

function copyFrame(atlas, atlasWidth, frame, definition, column, row) {
  const left = Math.round(column * definition.frameWidth + definition.frameWidth / 2 - frame.centerX);
  const top = row * definition.frameHeight + definition.frameHeight - 7 - frame.height;
  for (let y = 0; y < frame.height; y += 1) for (let x = 0; x < frame.width; x += 1) {
    const targetX = left + x;
    const targetY = top + y;
    if (targetX <= column * definition.frameWidth || targetX >= (column + 1) * definition.frameWidth - 1
      || targetY <= row * definition.frameHeight || targetY >= (row + 1) * definition.frameHeight - 1) continue;
    const source = (y * frame.width + x) * 4;
    const target = (targetY * atlasWidth + targetX) * 4;
    const alpha = frame.data[source + 3];
    if (!alpha) continue;
    atlas[target] = frame.data[source];
    atlas[target + 1] = frame.data[source + 1];
    atlas[target + 2] = frame.data[source + 2];
    atlas[target + 3] = alpha;
  }
}

function inspect(atlas, width, definition) {
  const rowReports = [];
  for (let row = 0; row < rows; row += 1) {
    const stats = [];
    for (let column = 0; column < columns; column += 1) {
      let area = 0;
      let weightedX = 0;
      let bottom = 0;
      for (let y = 0; y < definition.frameHeight; y += 1) for (let x = 0; x < definition.frameWidth; x += 1) {
        const alpha = atlas[((row * definition.frameHeight + y) * width
          + column * definition.frameWidth + x) * 4 + 3] / 255;
        if (!alpha) continue;
        area += alpha;
        weightedX += x * alpha;
        bottom = Math.max(bottom, y);
      }
      stats.push({ area, centerX: weightedX / Math.max(1, area), bottom });
    }
    const centers = stats.map(({ centerX }) => centerX * 78 / definition.frameHeight);
    const areas = stats.map(({ area }) => area);
    rowReports.push({
      centerDriftPx: Math.max(...centers) - Math.min(...centers),
      baselineDrift: Math.max(...stats.map(({ bottom }) => bottom)) - Math.min(...stats.map(({ bottom }) => bottom)),
      areaVariance: (Math.max(...areas) - Math.min(...areas)) / median(areas),
    });
  }
  return rowReports;
}

async function prepare(definition) {
  const source = resolve(root, `assets/skins/premium/heroes/source/${definition.id}-atlas-source.png`);
  const target = resolve(root, `assets/skins/premium/heroes/${definition.id}-atlas.webp`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bands = rowBands(data, info.width, info.height);
  if (![rows, rows - 1].includes(bands.length)) throw new Error(`${definition.id} has ${bands.length} detected rows`);
  const frames = await normalizeFrames(data, info, definition, bands);
  const width = definition.frameWidth * columns;
  const height = definition.frameHeight * rows;
  const atlas = Buffer.alloc(width * height * 4);
  frames.forEach((rowFrames, row) => rowFrames.forEach((frame, column) => (
    copyFrame(atlas, width, frame, definition, column, row)
  )));
  const report = inspect(atlas, width, definition);
  if (report.some(({ centerDriftPx, baselineDrift, areaVariance }) => (
    centerDriftPx > 2 || baselineDrift > 1 || areaVariance > 0.08
  ))) throw new Error(`${definition.id} failed alignment lint: ${JSON.stringify(report)}`);
  await sharp(atlas, { raw: { width, height, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(target);
  console.log(`${definition.id}: ${width}x${height} ${JSON.stringify(report)}`);
}

for (const atlas of atlases) await prepare(atlas);
