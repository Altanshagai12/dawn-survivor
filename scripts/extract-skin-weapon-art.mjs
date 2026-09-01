import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../assets/skins/premium/', import.meta.url);
const outputRoot = new URL('./weapons/', root);

function keepLargestAlphaComponent(data, width, height) {
  const pixels = width * height;
  const labels = new Int32Array(pixels);
  const queue = new Int32Array(pixels);
  const sizes = [0];
  let label = 0;
  for (let start = 0; start < pixels; start += 1) {
    if (labels[start] || data[start * 4 + 3] <= 4) continue;
    label += 1;
    let head = 0;
    let tail = 1;
    let size = 0;
    queue[0] = start;
    labels[start] = label;
    while (head < tail) {
      const current = queue[head++];
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if ((!offsetX && !offsetY) || x + offsetX < 0 || x + offsetX >= width
            || y + offsetY < 0 || y + offsetY >= height) continue;
          const next = current + offsetY * width + offsetX;
          if (!labels[next] && data[next * 4 + 3] > 4) {
            labels[next] = label;
            queue[tail++] = next;
          }
        }
      }
    }
    sizes[label] = size;
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (labels[pixel] === keep) continue;
    data[pixel * 4] = 0;
    data[pixel * 4 + 1] = 0;
    data[pixel * 4 + 2] = 0;
    data[pixel * 4 + 3] = 0;
  }
  return data;
}

function clearPackBackground(data) {
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (data[offset + 3] <= 8 || (maximum < 48 && maximum - minimum < 19)) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
  return data;
}

function clearWhiteFringe(data, width, height) {
  const alpha = new Uint8Array(width * height);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = data[pixel * 4 + 3];
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const pixel = y * width + x;
    if (!alpha[pixel]) continue;
    const offset = pixel * 4;
    const maximum = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    const minimum = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    if (maximum < 225 || maximum - minimum > 20) continue;
    let edge = false;
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (!alpha[pixel + offsetY * width + offsetX]) edge = true;
      }
    }
    if (edge) data[offset + 3] = 0;
  }
  return data;
}

const packs = Object.freeze({
  'shana-astral-warden': {
    source: 'shana-astral-warden-pack.webp',
    crops: {
      revolver: { left: 725, top: 55, width: 400, height: 250 },
      shotgun: { left: 1090, top: 75, width: 446, height: 245 },
      crossbow: { left: 720, top: 355, width: 440, height: 285 },
      flame: { left: 1120, top: 375, width: 416, height: 270 },
    },
  },
  'scarlett-sunforge-phoenix': {
    source: 'scarlett-sunforge-phoenix-pack.webp',
    crops: {
      revolver: { left: 690, top: 55, width: 430, height: 260 },
      shotgun: { left: 1080, top: 80, width: 456, height: 250 },
      crossbow: { left: 690, top: 355, width: 465, height: 300 },
      flame: { left: 1100, top: 385, width: 436, height: 280 },
    },
  },
  'hina-void-lotus': {
    source: 'hina-void-lotus-pack.webp',
    crops: {
      revolver: { left: 760, top: 85, width: 380, height: 255 },
      shotgun: { left: 1140, top: 90, width: 396, height: 255 },
      crossbow: { left: 750, top: 365, width: 410, height: 285 },
      flame: { left: 1140, top: 390, width: 396, height: 270 },
    },
  },
  'diamond-bloodmoon-regent': {
    source: 'diamond-bloodmoon-regent-pack.webp',
    crops: {
      revolver: { left: 840, top: 8, width: 505, height: 220 },
      shotgun: { left: 800, top: 210, width: 700, height: 190 },
      crossbow: { left: 820, top: 390, width: 700, height: 205 },
      flame: { left: 915, top: 575, width: 530, height: 190 },
    },
  },
  'shana-celestial-dragon-sovereign': {
    source: 'shana-celestial-dragon-sovereign-pack.webp',
    crops: {
      revolver: { left: 700, top: 40, width: 440, height: 285 },
      shotgun: { left: 1080, top: 55, width: 456, height: 270 },
      crossbow: { left: 690, top: 330, width: 500, height: 330 },
      flame: { left: 1085, top: 335, width: 451, height: 330 },
    },
  },
  'diamond-obsidian-eclipse-valkyrie': {
    source: 'diamond-obsidian-eclipse-valkyrie-pack.webp',
    crops: {
      revolver: { left: 760, top: 35, width: 540, height: 220 },
      shotgun: { left: 760, top: 215, width: 740, height: 210 },
      crossbow: { left: 760, top: 390, width: 740, height: 225 },
      flame: { left: 900, top: 555, width: 560, height: 225 },
    },
  },
  'scarlett-prismatic-tempest-seraph': {
    source: 'scarlett-prismatic-tempest-seraph-pack.webp',
    crops: {
      revolver: { left: 690, top: 35, width: 460, height: 290 },
      shotgun: { left: 1070, top: 55, width: 466, height: 285 },
      crossbow: { left: 680, top: 325, width: 520, height: 345 },
      flame: { left: 1080, top: 345, width: 456, height: 330 },
    },
  },
  'hina-nine-tail-chrono-kitsune': {
    source: 'hina-nine-tail-chrono-kitsune-pack.webp',
    crops: {
      revolver: { left: 750, top: 50, width: 430, height: 290 },
      shotgun: { left: 1120, top: 55, width: 416, height: 290 },
      crossbow: { left: 725, top: 335, width: 490, height: 325 },
      flame: { left: 1110, top: 350, width: 426, height: 320 },
    },
  },
});

for (const [skinId, pack] of Object.entries(packs)) {
  const directory = new URL(`./${skinId}/`, outputRoot);
  await mkdir(directory, { recursive: true });
  for (const [weaponId, crop] of Object.entries(pack.crops)) {
    const { data, info } = await sharp(fileURLToPath(new URL(pack.source, root)))
      .extract(crop)
      .resize(768, 384, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    clearPackBackground(data);
    clearWhiteFringe(data, info.width, info.height);
    await sharp(keepLargestAlphaComponent(data, info.width, info.height), { raw: info })
      .webp({ quality: 90, alphaQuality: 96, smartSubsample: true })
      .toFile(fileURLToPath(new URL(`./${weaponId}.webp`, directory)));
  }
}

console.log(`Generated ${Object.keys(packs).length * 4} premium weapon-card assets.`);
