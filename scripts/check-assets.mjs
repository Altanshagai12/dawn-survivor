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

async function pngSize(file) {
  const data = await readFile(file);
  if (data.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
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
  const { width, height } = await pngSize(file);
  if (width !== atlas.frameWidth * 6 || height !== atlas.frameHeight * 8) {
    throw new Error(`${atlas.key}: expected 6x8 frames, received ${width}x${height}`);
  }
}

for (const file of Object.values(STATIC_ASSETS)) await assertFile(file);

console.log(`Verified ${atlases.length} directional atlases and ${Object.keys(STATIC_ASSETS).length} static assets.`);
