import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const write = process.argv.includes('--write');
const fromHead = process.argv.includes('--from-head');
const configs = [
  ['diamond-bloodmoon-regent-atlas.webp', 2, 48, .88, 215],
  ['diamond-obsidian-eclipse-valkyrie-atlas.webp', 4, 1, .88, 195],
  ['hina-void-lotus-atlas.webp', 1.5, 40, .78, 215],
  ['hina-nine-tail-chrono-kitsune-atlas.webp', 2.5, 1, .78, 195],
];
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

function metrics(data) {
  let visible = 0;
  let alpha = 0;
  let solid = 0;
  let luminance = 0;
  for (let index = 0; index < data.length; index += 4) {
    const pixelAlpha = data[index + 3];
    if (!pixelAlpha) continue;
    const pixelLuminance = data[index] * .2126 + data[index + 1] * .7152 + data[index + 2] * .0722;
    visible += 1;
    alpha += pixelAlpha;
    if (pixelAlpha >= 240) solid += 1;
    luminance += pixelLuminance * pixelAlpha / 255;
  }
  return {
    averageAlpha: alpha / visible,
    solidRatio: solid / visible,
    premultipliedLuminance: luminance / visible,
  };
}

for (const [name, alphaFactor, alphaCutoff, gamma, targetAlpha] of configs) {
  const file = new URL(`../assets/skins/premium/heroes/${name}`, import.meta.url);
  const relativePath = `assets/skins/premium/heroes/${name}`;
  const source = fromHead
    ? execFileSync('git', ['show', `HEAD:${relativePath}`], {
      cwd: repoRoot, encoding: null, maxBuffer: 16 * 1024 * 1024,
    })
    : await readFile(file);
  const decoded = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const before = metrics(decoded.data);
  if (before.averageAlpha >= targetAlpha && before.solidRatio >= .7
    && before.premultipliedLuminance >= 60) {
    console.log(`OK ${name}`);
    continue;
  }
  for (let index = 0; index < decoded.data.length; index += 4) {
    const alpha = decoded.data[index + 3];
    if (alpha < alphaCutoff) {
      decoded.data[index + 3] = 0;
      continue;
    }
    for (let channel = 0; channel < 3; channel += 1) {
      decoded.data[index + channel] = clampByte(
        255 * (decoded.data[index + channel] / 255) ** gamma,
      );
    }
    decoded.data[index + 3] = clampByte(alpha * alphaFactor);
  }
  const after = metrics(decoded.data);
  if (!write) {
    console.error(`NEEDS REPAIR ${name}`, { before, after });
    process.exitCode = 1;
    continue;
  }
  const encoded = await sharp(decoded.data, { raw: decoded.info })
    .webp({ quality: 96, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  await writeFile(file, encoded);
  console.log(`REPAIRED ${name}`, after);
}
