import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const TRANSPARENT_ALPHA = 12;
const SOLID_ALPHA = 96;

function isPaleRedrawCandidate(data, pixel) {
  const red = data[pixel];
  const green = data[pixel + 1];
  const blue = data[pixel + 2];
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return maximum >= 150 && maximum - minimum <= 56;
}

export function stripPaleOutline(data, width, height) {
  const source = Buffer.from(data);
  let removed = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = (y * width + x) * 4;
      if (source[pixel + 3] < SOLID_ALPHA || !isPaleRedrawCandidate(source, pixel)) continue;
      const brightness = Math.max(source[pixel], source[pixel + 1], source[pixel + 2]);
      let touchesTransparency = false;
      let touchesDarkerColor = false;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (!ox && !oy) continue;
          const neighbor = ((y + oy) * width + x + ox) * 4;
          const alpha = source[neighbor + 3];
          if (alpha < TRANSPARENT_ALPHA) touchesTransparency = true;
          if (alpha >= SOLID_ALPHA) {
            const red = source[neighbor];
            const green = source[neighbor + 1];
            const blue = source[neighbor + 2];
            const maximum = Math.max(red, green, blue);
            const minimum = Math.min(red, green, blue);
            if (maximum <= brightness - 22 || maximum - minimum >= 70) touchesDarkerColor = true;
          }
        }
      }
      if (!touchesTransparency || !touchesDarkerColor) continue;
      data[pixel] = 0;
      data[pixel + 1] = 0;
      data[pixel + 2] = 0;
      data[pixel + 3] = 0;
      removed += 1;
    }
  }
  return removed;
}

export function erodeExteriorPixels(data, width, height, passes = 1) {
  let removed = 0;
  for (let pass = 0; pass < passes; pass += 1) {
    const source = Buffer.from(data);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = (y * width + x) * 4;
        if (source[pixel + 3] < TRANSPARENT_ALPHA) continue;
        let exterior = false;
        for (let oy = -1; oy <= 1 && !exterior; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (!ox && !oy) continue;
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height
              || source[(ny * width + nx) * 4 + 3] < TRANSPARENT_ALPHA) {
              exterior = true;
              break;
            }
          }
        }
        if (!exterior) continue;
        data.fill(0, pixel, pixel + 4);
        removed += 1;
      }
    }
  }
  return removed;
}

export async function writeSpriteWebp(data, width, height, outputFile) {
  await mkdir(dirname(outputFile), { recursive: true });
  await sharp(data, { raw: { width, height, channels: 4 } })
    .webp({ quality: 94, alphaQuality: 100, smartSubsample: false, effort: 5 })
    .toFile(outputFile);
}

export async function cleanSimpleAtlas(sourceFile, outputFile) {
  const { data, info } = await sharp(sourceFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palePixels = stripPaleOutline(data, info.width, info.height);
  const edgePixels = erodeExteriorPixels(data, info.width, info.height);
  await writeSpriteWebp(data, info.width, info.height, outputFile);
  return { palePixels, edgePixels };
}
