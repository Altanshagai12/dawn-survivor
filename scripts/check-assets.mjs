import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  BOSS_ATLASES,
  ENEMY_ATLASES,
  HERO_ATLASES,
  STATIC_ASSETS,
} from '../src/config/assets.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function imageSize(file) {
  const data = await readFile(file);
  if (data.toString('ascii', 1, 4) === 'PNG') {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`${file} is not a supported image`);
  }
  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
  }
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  }
  throw new Error(`${file} has an unsupported WebP chunk`);
}

async function assertFile(relativePath) {
  const absolutePath = resolve(root, relativePath.replace(/^\.\//, ''));
  const info = await stat(absolutePath);
  if (!info.isFile() || info.size === 0) throw new Error(`Missing asset: ${relativePath}`);
  return absolutePath;
}

const atlases = [
  ...Object.values(HERO_ATLASES),
  ...Object.values(ENEMY_ATLASES),
  ...Object.values(BOSS_ATLASES),
];

for (const atlas of atlases) {
  const file = await assertFile(atlas.file);
  const { width, height } = await imageSize(file);
  if (width !== atlas.frameWidth * 6 || height !== atlas.frameHeight * 8) {
    throw new Error(`${atlas.key}: expected 6x8 frames, received ${width}x${height}`);
  }
}

for (const file of Object.values(STATIC_ASSETS)) await assertFile(file);

console.log(`Verified ${atlases.length} directional atlases and ${Object.keys(STATIC_ASSETS).length} static assets.`);
